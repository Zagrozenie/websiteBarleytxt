require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const WEBSITE_ROOT = path.join(__dirname, "..");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const multer = require("multer");
const TexturePackConverter = require("./utils/converter");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

const mappingsPath = path.join(__dirname, "utils", "mappings.js");
const mappingsContent = fs.readFileSync(mappingsPath, "utf8");
const MAPPINGS = eval(mappingsContent + "; MAPPINGS");

const converter = new TexturePackConverter(MAPPINGS);

const app = express();

app.set("trust proxy", true);

const allowedOrigins = [
  "https://barleytxt.pl",
  "http://barleytxt.pl",
  "https://www.barleytxt.pl",
  "http://www.barleytxt.pl",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const _ALLOWED_HOSTS = [
  "barleytxt.pl",
  "www.barleytxt.pl",
  "localhost",
  "127.0.0.1"
];
function _isHostAllowed(urlStr) {
  if (!urlStr) return false;
  try {
    const raw = urlStr.includes("://") ? urlStr : `http://${urlStr}`;
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    for (const allowed of _ALLOWED_HOSTS) {
      const a = allowed.toLowerCase();
      if (host === a) return true;
      if (host.endsWith("." + a)) return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

function checkOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    return next();
  }

  const isAllowed = (origin && _isHostAllowed(origin)) || (referer && _isHostAllowed(referer));

  if (isAllowed) {
    return next();
  }

  res.status(403).send("Not Found");
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (_isHostAllowed(origin)) return cb(null, true);
    cb(new Error("Request denied"));
  },
  credentials: true,
  optionsSuccessStatus: 204
}));

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI).catch((err) => {
    console.warn("MongoDB connection warning:", err.message);
  });
} else {
  console.log("No MONGO_URI provided - running with file/JSON storage fallback.");
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (_isHostAllowed(origin)) return cb(null, true);
      cb(new Error("Request denied"));
    },
    credentials: true
  }
});

const userConnections = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) return;

  const current = userConnections.get(userId) || 0;
  userConnections.set(userId, current + 1);

  io.emit("online-users", userConnections.size);

  socket.on("disconnect", () => {
    const current = userConnections.get(userId) || 0;

    if (current <= 1) {
      userConnections.delete(userId);
    } else {
      userConnections.set(userId, current - 1);
    }

    io.emit("online-users", userConnections.size);
  });
});


const StatSchema = new mongoose.Schema({
  packId: {
    type: String,
    unique: true
  },

  views: {
    type: Number,
    default: 0
  },

  downloads: {
    type: Number,
    default: 0
  },

  recentViews: [
    {
      ip: String,
      date: Date
    }
  ],

  recentDownloads: [
    {
      ip: String,
      date: Date
    }
  ]
});

const Stat = mongoose.model("Stat", StatSchema);

const GlobalStatSchema = new mongoose.Schema({
  singleton: {
    type: String,
    unique: true,
    default: "global"
  },
  dailyDownloads: {
    type: Map,
    of: Number,
    default: {}
  },
  dailyVisits: {
    type: Map,
    of: Number,
    default: {}
  }
});

const GlobalStat = mongoose.model("GlobalStat", GlobalStatSchema);

async function incrementGlobalDownload(date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const update = { $inc: { [`dailyDownloads.${key}`]: 1 } };
  await GlobalStat.findOneAndUpdate(
    { singleton: "global" },
    update,
    { upsert: true, new: true }
  );
}

async function incrementGlobalVisit(date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const update = { $inc: { [`dailyVisits.${key}`]: 1 } };
  await GlobalStat.findOneAndUpdate(
    { singleton: "global" },
    update,
    { upsert: true, new: true }
  );
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function generateRandomString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const LinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  texturepack: {
    type: String,
    required: true
  },
  socialLinks: [{
    type: String,
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Link = mongoose.model("Link", LinkSchema);

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    req.ip
  );
}

function normalizeIp(ip) {
  if (!ip) return "";
  const trimmed = ip.trim();
  const v6Match = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v6Match) return v6Match[1];
  return trimmed;
}

function getWhitelistedIps() {
  const raw = process.env.WHITELISTED_IPS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeIp);
}

function isWhitelistedIp(req) {
  const clientIp = normalizeIp(getClientIp(req));
  const list = getWhitelistedIps();
  return list.some((entry) => entry === clientIp);
}

app.post("/view/:packId", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const now = new Date();
    const whitelisted = isWhitelistedIp(req);

    let stat = await Stat.findOne({ packId: req.params.packId });

    if (!stat) {
      stat = new Stat({
        packId: req.params.packId
      });
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    stat.recentViews = stat.recentViews.filter(
      entry => entry.date > oneHourAgo
    );

    const alreadyViewed = whitelisted
      ? false
      : stat.recentViews.some(
        entry => entry.ip === ip
      );

    if (!alreadyViewed) {
      stat.views += 1;

      stat.recentViews.push({
        ip,
        date: now
      });

      await stat.save();
    }

    res.json({
      views: stat.views
    });

  } catch (err) {
    res.status(500).send("Błąd serwera");
  }
});

const recentSiteVisits = new Map();

app.post("/page-visit", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const now = new Date();
    const whitelisted = isWhitelistedIp(req);

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [storedIp, storedDate] of recentSiteVisits.entries()) {
      if (storedDate < oneHourAgo) {
        recentSiteVisits.delete(storedIp);
      }
    }

    const alreadyVisited = whitelisted
      ? false
      : recentSiteVisits.has(ip);

    if (!alreadyVisited) {
      recentSiteVisits.set(ip, now);
      await incrementGlobalVisit(now);
    }

    res.json({ ok: true });

  } catch (err) {
    res.status(500).send("Błąd serwera");
  }
});

app.post("/download/:packId", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const now = new Date();
    const whitelisted = isWhitelistedIp(req);

    let stat = await Stat.findOne({ packId: req.params.packId });

    if (!stat) {
      stat = new Stat({
        packId: req.params.packId
      });
    }

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    stat.recentDownloads = stat.recentDownloads.filter(
      entry => entry.date > fiveMinutesAgo
    );

    const alreadyDownloaded = whitelisted
      ? false
      : stat.recentDownloads.some(
        entry => entry.ip === ip
      );

    if (!alreadyDownloaded) {
      stat.downloads += 1;

      stat.recentDownloads.push({
        ip,
        date: now
      });

      await stat.save();
      await incrementGlobalDownload(now);
    }

    res.json({
      downloads: stat.downloads
    });

  } catch (err) {
    res.status(500).send("Błąd serwera");
  }
});

app.get("/total-downloads", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await Stat.find({});
      const totalDownloads = stats.reduce(
        (sum, s) => sum + (s.downloads || 0),
        0
      );
      return res.json({ totalDownloads });
    }

    let totalDownloads = 0;
    try {
      const localStats = JSON.parse(fs.readFileSync(path.join(__dirname, "pack_downloads.json"), "utf8"));
      totalDownloads = Object.values(localStats).reduce((a, b) => a + b, 0);
    } catch (_) { }
    res.json({ totalDownloads });

  } catch (error) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

function formatDateTimePL(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDatePL(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function sameDayPL(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dateKeyPL(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

app.get("/global-stats", async (req, res) => {
  try {
    const key = req.query.key;
    if (!key || key !== process.env.STATS_KEY) {
      return res.status(403).json({ error: "Brak dostępu" });
    }

    const doc = await GlobalStat.findOne({ singleton: "global" });
    const daily = doc?.dailyDownloads || new Map();
    const dailyVisits = doc?.dailyVisits || new Map();

    const now = new Date();
    const nowTs = now.getTime();
    const thisYear = now.getFullYear();
    const thisMonthIdx = now.getMonth();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfThisWeek = new Date(now);
    const dayOfWeek = (startOfThisWeek.getDay() + 6) % 7;
    startOfThisWeek.setDate(startOfThisWeek.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfThisMonth = new Date(thisYear, thisMonthIdx, 1);
    const startOfYear = new Date(thisYear, 0, 1);

    const oneDayMs = 24 * 60 * 60 * 1000;
    const last24hStart = new Date(nowTs - 24 * 60 * 60 * 1000);
    const last7dStart = new Date(nowTs - 7 * oneDayMs);
    const last30dStart = new Date(nowTs - 30 * oneDayMs);

    let last24h = 0;
    let last7d = 0;
    let last30d = 0;
    let today = 0;
    let yesterdayTotal = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let yearTotal = 0;
    let totalAllTime = 0;

    for (const [dateKey, count] of daily.entries()) {
      const n = Number(count) || 0;
      if (n <= 0) continue;

      const [y, m, d] = dateKey.split("-").map(Number);
      if (!y || !m || !d) continue;

      const entryDateLocal = new Date(y, m - 1, d);
      const entryTsLocal = entryDateLocal.getTime();

      totalAllTime += n;

      if (entryTsLocal >= last24hStart.getTime()) {
        last24h += n;
      }
      if (entryTsLocal >= last7dStart.getTime()) {
        last7d += n;
      }
      if (entryTsLocal >= last30dStart.getTime()) {
        last30d += n;
      }
      if (sameDayPL(entryDateLocal, now)) {
        today += n;
      }
      if (sameDayPL(entryDateLocal, yesterday)) {
        yesterdayTotal += n;
      }
      if (entryTsLocal >= startOfThisWeek.getTime()) {
        thisWeek += n;
      }
      if (entryTsLocal >= startOfThisMonth.getTime()) {
        thisMonth += n;
      }
      if (entryTsLocal >= startOfYear.getTime()) {
        yearTotal += n;
      }
    }

    const lastDays = [];
    const daysCount = 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = dateKeyPL(d);
      const value = Number(daily.get(key)) || 0;
      lastDays.push({
        date: formatDatePL(d),
        downloads: value
      });
    }

    let visitsLast24h = 0;
    let visitsLast7d = 0;
    let visitsLast30d = 0;
    let visitsYearTotal = 0;
    let visitsTotalAllTime = 0;

    for (const [dateKey, count] of dailyVisits.entries()) {
      const n = Number(count) || 0;
      if (n <= 0) continue;

      const [y, m, d] = dateKey.split("-").map(Number);
      if (!y || !m || !d) continue;

      const entryDateLocal = new Date(y, m - 1, d);
      const entryTsLocal = entryDateLocal.getTime();

      visitsTotalAllTime += n;

      if (entryTsLocal >= last24hStart.getTime()) {
        visitsLast24h += n;
      }
      if (entryTsLocal >= last7dStart.getTime()) {
        visitsLast7d += n;
      }
      if (entryTsLocal >= last30dStart.getTime()) {
        visitsLast30d += n;
      }
      if (entryTsLocal >= startOfYear.getTime()) {
        visitsYearTotal += n;
      }
    }

    const visitsLastDays = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = dateKeyPL(d);
      const value = Number(dailyVisits.get(key)) || 0;
      visitsLastDays.push({
        date: formatDatePL(d),
        visits: value
      });
    }

    res.json({
      downloadsLast24h: last24h,
      downloadsLast7d: last7d,
      downloadsLast30d: last30d,
      downloadsThisYear: yearTotal,
      downloadsTotal: totalAllTime,
      downloadsDetailed: lastDays,
      visitsLast24h,
      visitsLast7d,
      visitsLast30d,
      visitsThisYear: visitsYearTotal,
      visitsTotal: visitsTotalAllTime,
      visitsDetailed: visitsLastDays,
      generatedAt: formatDateTimePL(now)
    });

  } catch (error) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

app.get("/online", async (req, res) => {
  try {
    const widgetData = await new Promise((resolve, reject) => {
      const options = {
        hostname: "discord.com",
        path: "/api/guilds/1193548424847568938/widget.json",
        method: "GET",
        headers: {
          "User-Agent": "BarleyTxT/1.0 (+https://barleytxt.pl)",
          "Accept": "application/json"
        }
      };
      const reqDiscord = https.request(options, (resp) => {
        let body = "";
        resp.on("data", (chunk) => body += chunk);
        resp.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      reqDiscord.on("error", reject);
      reqDiscord.setTimeout(5000, () => reqDiscord.destroy(new Error("Timeout")));
      reqDiscord.end();
    });
    res.json({
      online: widgetData.presence_count || 0
    });
  } catch (err) {
    res.json({
      online: 0,
      error: err.message
    });
  }
});

app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    const { srcVer, destVer } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Brak pliku" });
    }

    if (!srcVer || !destVer) {
      return res.status(400).json({ error: "Brak wersji źródłowej lub docelowej" });
    }

    if (!MAPPINGS.protocol[srcVer] || !MAPPINGS.protocol[destVer]) {
      return res.status(400).json({ error: "Nieprawidłowa wersja" });
    }

    const convertedBuffer = await converter.convert(file.buffer, srcVer, destVer);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="converted_${destVer}_${file.originalname}"`);
    res.send(convertedBuffer);

  } catch (err) {
    res.status(500).json({ error: err.message || "Błąd podczas konwertowania" });
  }
});

app.post("/api/links", async (req, res) => {
  try {
    const { title, texturepack, socialLinks } = req.body;

    if (!title || !texturepack) {
      return res.status(400).json({ error: "Tytuł i link do texturepacka są wymagane" });
    }

    let slug = generateSlug(title);
    let existingLink = await Link.findOne({ slug });

    while (existingLink) {
      slug = `${generateSlug(title)}-${generateRandomString()}`;
      existingLink = await Link.findOne({ slug });
    }

    const newLink = new Link({
      title,
      slug,
      texturepack,
      socialLinks: socialLinks || []
    });

    const savedLink = await newLink.save();

    res.json({ id: savedLink._id, slug: savedLink.slug });
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

app.get("/api/links/:id", async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: "Link nie znaleziony" });
    }
    res.json({
      title: link.title,
      texturepack: link.texturepack,
      socialLinks: link.socialLinks
    });
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

app.get("/api/links/slug/:slug", async (req, res) => {
  try {
    const link = await Link.findOne({ slug: req.params.slug });
    if (!link) {
      return res.status(404).json({ error: "Link nie znaleziony" });
    }
    res.json({
      title: link.title,
      texturepack: link.texturepack,
      socialLinks: link.socialLinks
    });
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

const reservedSlugs = [
  "404", "404.html",
  "changelog", "changelog.html",
  "converter", "converter.html",
  "create", "create.html",
  "index", "index.html",
  "privacy-policy", "privacy-policy.html",
  "terms-of-service", "terms-of-service.html",
  "unlock", "unlock.html",
  "texturepacks",
  "texturepack",
  "texturepacks.json",
  "robots.txt",
  "sitemap.xml",
  "de",
  "en"
];

function pathExists(relativePath) {
  try {
    const fullPath = path.join(WEBSITE_ROOT, relativePath);
    return fs.existsSync(fullPath);
  } catch (err) {
    return false;
  }
}

function isReservedOrFileExists(slug, langPrefix = "") {
  if (reservedSlugs.includes(slug)) {
    return true;
  }

  const checkPaths = [
    path.join(langPrefix, slug),
    path.join(langPrefix, `${slug}.html`)
  ];

  return checkPaths.some(checkPath => pathExists(checkPath));
}

app.get("/texturepacks.json", (req, res) => {
  const backendPacksPath = path.join(__dirname, "texturepacks.json");
  const rootPacksPath = path.join(__dirname, "..", "texturepacks.json");
  const target = fs.existsSync(backendPacksPath) ? backendPacksPath : rootPacksPath;
  res.sendFile(target);
});

const ADMIN_SECRET = process.env.ADMIN_KEY || "barleyadmin2024";

function getLocalPacks() {
  const backendPacksPath = path.join(__dirname, "texturepacks.json");
  const publicPacksPath = path.join(WEBSITE_ROOT, "public", "texturepacks.json");
  const rootPacksPath = path.join(WEBSITE_ROOT, "texturepacks.json");

  const candidates = [backendPacksPath, publicPacksPath, rootPacksPath];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) { }
    }
  }
  return [];
}

function saveLocalPacks(packs) {
  const data = JSON.stringify(packs, null, 2);
  const targets = [
    path.join(__dirname, "texturepacks.json"),
    path.join(WEBSITE_ROOT, "public", "texturepacks.json"),
    path.join(WEBSITE_ROOT, "texturepacks.json"),
    path.join(WEBSITE_ROOT, "dist", "texturepacks.json")
  ];
  for (const targetPath of targets) {
    try {
      const parentDir = path.dirname(targetPath);
      if (fs.existsSync(parentDir)) {
        fs.writeFileSync(targetPath, data, "utf8");
      }
    } catch (_) { }
  }
}

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] ||
    (req.headers.authorization && req.headers.authorization.replace("Bearer ", "").trim()) ||
    req.body?.adminKey ||
    req.query?.adminKey;
  if (!key || key !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Brak autoryzacji administratora" });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    return res.json({ success: true, token: ADMIN_SECRET, user: "admin" });
  }
  return res.status(401).json({ error: "Nieprawidłowe hasło administratora" });
});

app.get("/api/packs", async (req, res) => {
  try {
    const packs = getLocalPacks();
    if (mongoose.connection.readyState === 1) {
      const stats = await Stat.find({}, "packId downloads views").lean();
      const statsMap = new Map(stats.map((s) => [s.packId, s]));
      const enriched = packs.map((p) => {
        const s = statsMap.get(p.id);
        return {
          ...p,
          downloads: s?.downloads || 0,
          views: s?.views || 0,
        };
      });
      return res.json(enriched);
    }

    let localStats = {};
    try {
      localStats = JSON.parse(fs.readFileSync(path.join(__dirname, "pack_downloads.json"), "utf8"));
    } catch (_) { }
    const enriched = packs.map((p) => ({
      ...p,
      downloads: localStats[p.id] || 0,
      views: 0,
    }));
    res.json(enriched);
  } catch (err) {
    res.json(getLocalPacks());
  }
});

app.get("/api/packs/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 9;
    const packs = getLocalPacks();
    let statsMap = new Map();
    if (mongoose.connection.readyState === 1) {
      const stats = await Stat.find({}, "packId downloads views").lean();
      statsMap = new Map(stats.map((s) => [s.packId, s]));
    } else {
      try {
        const localStats = JSON.parse(fs.readFileSync(path.join(__dirname, "pack_downloads.json"), "utf8"));
        statsMap = new Map(Object.entries(localStats).map(([id, dl]) => [id, { downloads: dl, views: 0 }]));
      } catch (_) { }
    }
    const enriched = packs.map((p) => {
      const s = statsMap.get(p.id);
      return {
        ...p,
        downloads: s?.downloads || 0,
        views: s?.views || 0,
      };
    });
    enriched.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    res.json(enriched.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// Admin upload Minecraft pack .zip file
app.post("/api/admin/upload-pack", requireAdmin, upload.single("packFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Brak pliku .zip" });
    }

    const zip = new JSZip();
    await zip.loadAsync(req.file.buffer);

    let mcmeta = null;
    let packFormat = null;
    let packDesc = "";

    let mcmetaFile = zip.file("pack.mcmeta");
    if (!mcmetaFile) {
      const candidates = zip.file(/pack\.mcmeta$/i);
      if (candidates.length > 0) mcmetaFile = candidates[0];
    }

    if (mcmetaFile) {
      try {
        const text = await mcmetaFile.async("string");
        mcmeta = JSON.parse(text);
        packFormat = mcmeta?.pack?.pack_format;
        if (typeof mcmeta?.pack?.description === "string") {
          packDesc = mcmeta.pack.description;
        } else if (typeof mcmeta?.pack?.description === "object") {
          packDesc = JSON.stringify(mcmeta.pack.description);
        }
      } catch (err) {
        console.warn("Failed to parse pack.mcmeta:", err.message);
      }
    }

    const formatToVersion = {
      1: "1.8.9+",
      2: "1.9+",
      3: "1.12.2+",
      4: "1.13+",
      5: "1.15+",
      6: "1.16.5+",
      7: "1.17+",
      8: "1.18.2+",
      9: "1.19.2+",
      12: "1.19.3+",
      13: "1.19.4+",
      15: "1.20+",
      18: "1.20.2+",
      22: "1.20.4+",
      32: "1.20.6+",
      34: "1.21+",
      42: "1.21.2+",
      46: "1.21.4+"
    };
    const detectedVersion = packFormat && formatToVersion[packFormat] ? formatToVersion[packFormat] : (packFormat ? `Format ${packFormat}` : "1.20+");

    let iconDataUrl = null;
    let iconFile = zip.file("pack.png");
    if (!iconFile) {
      const iconCandidates = zip.file(/pack\.png$/i);
      if (iconCandidates.length > 0) iconFile = iconCandidates[0];
    }

    if (iconFile) {
      const iconBuf = await iconFile.async("nodebuffer");
      iconDataUrl = `data:image/png;base64,${iconBuf.toString("base64")}`;
    }

    const originalName = req.file.originalname || "custom_pack.zip";
    const cleanName = path.parse(originalName).name
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return res.json({
      success: true,
      data: {
        filename: originalName,
        size: req.file.size,
        cleanName: cleanName || "Paczka Minecraft",
        packFormat,
        detectedVersion,
        description: packDesc,
        hasIcon: !!iconFile,
        iconDataUrl
      }
    });
  } catch (err) {
    console.error("Pack upload error:", err);
    res.status(500).json({ error: "Błąd analizy paczki: " + err.message });
  }
});

// Admin upload pack image (background or icon) with permanent disk storage
app.post("/api/admin/upload-image", requireAdmin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Brak przesłanego pliku graficznego" });
    }

    const packId = (req.body.packId || `pack_${Date.now()}`)
      .toString()
      .trim()
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const type = req.body.type === "icon" ? "icon" : "background";

    let ext = path.extname(req.file.originalname || "").toLowerCase();
    if (![".png", ".webp", ".jpg", ".jpeg"].includes(ext)) {
      ext = ".png";
    }

    const fileName = `${type}${ext}`;

    const targetDirs = [
      path.join(WEBSITE_ROOT, "public", "assets", "img", "texturepacks", packId),
      path.join(WEBSITE_ROOT, "assets", "img", "texturepacks", packId)
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, fileName), req.file.buffer);
      } catch (e) {
        console.warn("Nie udało się zapisać zdjęcia w:", dir, e.message);
      }
    }

    const publicUrl = `/assets/img/texturepacks/${packId}/${fileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName,
      packId
    });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: "Błąd podczas zapisywania zdjęcia: " + err.message });
  }
});

app.post("/api/admin/packs", requireAdmin, (req, res) => {
  try {
    const { name, author, version, category, download, image, icon } = req.body;
    if (!name || !download) {
      return res.status(400).json({ error: "Nazwa paczki i link do pobrania są wymagane" });
    }

    const packs = getLocalPacks();
    const id = generateSlug(name) || `pack_${Date.now()}`;

    let finalId = id;
    let counter = 1;
    while (packs.some(p => p.id === finalId)) {
      finalId = `${id}_${counter++}`;
    }

    const newPack = {
      id: finalId,
      name: name.trim(),
      author: (author || "Nieznany").trim(),
      image: image || "/assets/img/texturepack.png",
      icon: icon || "/assets/img/favicon.png",
      version: (version || "1.20+").trim(),
      category: (category || "pvp").toLowerCase().trim(),
      download: download.trim()
    };

    packs.unshift(newPack);
    saveLocalPacks(packs);

    res.json({ success: true, pack: newPack, totalPacks: packs.length });
  } catch (err) {
    res.status(500).json({ error: "Błąd podczas zapisywania paczki" });
  }
});

app.put("/api/admin/packs/:id", requireAdmin, (req, res) => {
  try {
    const packId = req.params.id;
    const packs = getLocalPacks();
    const index = packs.findIndex(p => p.id === packId || p.id?.toLowerCase() === packId.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: "Nie znaleziono paczki" });
    }

    const updated = {
      ...packs[index],
      ...req.body,
      id: packs[index].id
    };

    packs[index] = updated;
    saveLocalPacks(packs);

    res.json({ success: true, pack: updated });
  } catch (err) {
    res.status(500).json({ error: "Błąd podczas edycji paczki" });
  }
});

app.delete("/api/admin/packs/:id", requireAdmin, async (req, res) => {
  try {
    const rawId = req.params.id;
    const packId = decodeURIComponent(rawId).trim();
    const cleanId = packId.toLowerCase().replace(/[-_ ]/g, "");

    let packs = getLocalPacks();
    const initialLen = packs.length;

    packs = packs.filter((p) => {
      if (!p) return false;
      const pid = (p.id || "").toString().trim();
      const pidLower = pid.toLowerCase();
      const pidClean = pidLower.replace(/[-_ ]/g, "");
      return pid !== packId && pidLower !== packId.toLowerCase() && pidClean !== cleanId;
    });

    if (packs.length === initialLen) {
      return res.status(404).json({ error: "Nie znaleziono paczki o podanym ID" });
    }

    saveLocalPacks(packs);

    // Usuń przypisany folder ze zdjęciami, jeśli istniał
    const safePackId = packId.replace(/[^\w\s-]/gi, "").replace(/\s+/g, "_").toLowerCase();
    const dirsToDelete = [
      path.join(WEBSITE_ROOT, "public", "assets", "img", "texturepacks", safePackId),
      path.join(WEBSITE_ROOT, "assets", "img", "texturepacks", safePackId)
    ];
    for (const d of dirsToDelete) {
      try {
        if (fs.existsSync(d)) {
          fs.rmSync(d, { recursive: true, force: true });
        }
      } catch (_) { }
    }

    // Wyczyść statystyki pobrań
    try {
      const statsFile = path.join(__dirname, "pack_downloads.json");
      if (fs.existsSync(statsFile)) {
        const stats = JSON.parse(fs.readFileSync(statsFile, "utf8"));
        delete stats[packId];
        delete stats[rawId];
        fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), "utf8");
      }
    } catch (_) { }

    if (mongoose.connection.readyState === 1) {
      try {
        await Stat.deleteMany({ packId: { $in: [packId, rawId] } });
      } catch (_) { }
    }

    res.json({ success: true, id: packId, remainingCount: packs.length });
  } catch (err) {
    console.error("Pack delete error:", err);
    res.status(500).json({ error: "Błąd podczas usuwania paczki" });
  }
});

app.get("/stats/:packId", checkOrigin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const stat = await Stat.findOne({
        packId: req.params.packId
      });

      return res.json(
        stat || {
          views: 0,
          downloads: 0
        }
      );
    }

    let dl = 0;
    try {
      const localStats = JSON.parse(fs.readFileSync(path.join(__dirname, "pack_downloads.json"), "utf8"));
      dl = localStats[req.params.packId] || 0;
    } catch (_) { }

    res.json({
      views: 0,
      downloads: dl
    });

  } catch (err) {
    res.status(500).send("Błąd serwera");
  }
});

app.get("/api/check-whitelist", checkOrigin, async (req, res) => {
  const whitelisted = isWhitelistedIp(req);
  res.json({ whitelisted });
});

function getIndexHtml() {
  const distIndex = path.join(WEBSITE_ROOT, "dist", "index.html");
  const rootIndex = path.join(WEBSITE_ROOT, "index.html");
  if (fs.existsSync(distIndex)) {
    return fs.readFileSync(distIndex, "utf8");
  }
  if (fs.existsSync(rootIndex)) {
    return fs.readFileSync(rootIndex, "utf8");
  }
  return null;
}

function servePackHtml(req, res, packId) {
  const packs = getLocalPacks();
  const slug = (packId || "").trim();
  const decoded = decodeURIComponent(slug).toLowerCase();
  const clean = decoded.replace(/[-_ ]/g, "");

  const pack = packs.find(
    (p) =>
      p.id === slug ||
      p.id?.toLowerCase() === decoded ||
      p.id?.toLowerCase().replace(/[-_ ]/g, "") === clean ||
      p.name?.toLowerCase() === decoded ||
      p.name?.toLowerCase().replace(/[-_ ]/g, "") === clean
  );

  let html = getIndexHtml();
  if (!html) {
    const fallbackPath = fs.existsSync(path.join(WEBSITE_ROOT, "dist", "index.html"))
      ? path.join(WEBSITE_ROOT, "dist", "index.html")
      : path.join(WEBSITE_ROOT, "index.html");
    return res.sendFile(fallbackPath);
  }

  if (pack) {
    const packTitle = `${pack.name} — Texturepack Minecraft | BarleyTxT.pl`;
    const packDesc = `Pobierz texturepack ${pack.name} (${pack.version || "1.20+"}) autorstwa ${pack.author} na BarleyTxT.pl! Darmowe pobieranie, statystyki i podgląd 3D.`;
    const packImg = pack.image?.startsWith("http")
      ? pack.image
      : `https://barleytxt.pl${pack.image || "/assets/img/logo.png"}`;
    const packUrl = `https://barleytxt.pl/texturepacks/${pack.id}`;

    // Dynamic Open Graph & Twitter meta tags for Discord embed
    html = html
      .replace(/<title>.*?<\/title>/i, `<title>${packTitle}</title>`)
      .replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${packTitle}" />`)
      .replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${packDesc}" />`)
      .replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${packDesc}" />`)
      .replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${packImg}" />`)
      .replace(
        /<\/head>/i,
        `    <meta property="og:url" content="${packUrl}" />\n` +
        `    <meta name="twitter:card" content="summary_large_image" />\n` +
        `    <meta name="twitter:title" content="${packTitle}" />\n` +
        `    <meta name="twitter:description" content="${packDesc}" />\n` +
        `    <meta name="twitter:image" content="${packImg}" />\n</head>`
      );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

// Obsługa starych i nowych linków do texturepacków z Discorda (np. /texturepacks/egz0tyczny_txtt)
app.get([
  "/texturepacks/:packId",
  "/texturepack/:packId",
  "/en/texturepacks/:packId",
  "/de/texturepacks/:packId",
  "/en/texturepack/:packId",
  "/de/texturepack/:packId"
], (req, res, next) => {
  const packId = req.params.packId;
  const isCategory = ["all", "pvp", "boxpvp", "overlay", "wszystkie", "nakladki"].includes((packId || "").toLowerCase());
  if (isCategory) {
    const html = getIndexHtml();
    if (html) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }
    return res.sendFile(path.join(WEBSITE_ROOT, "index.html"));
  }
  return servePackHtml(req, res, packId);
});

app.use(express.static(WEBSITE_ROOT));

app.get("/en/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (reservedSlugs.includes(slug) || reservedSlugs.includes(`${slug}.html`)) {
      return next();
    }

    const checkPaths = [
      path.join(WEBSITE_ROOT, "en", slug),
      path.join(WEBSITE_ROOT, "en", `${slug}.html`)
    ];
    const fileExists = checkPaths.some(checkPath => fs.existsSync(checkPath));

    if (fileExists) {
      return next();
    }

    const link = await Link.findOne({ slug: slug });
    if (link) {
      return res.sendFile(path.join(WEBSITE_ROOT, "en", "unlock.html"));
    }

    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "en", "404.html"));
  } catch (err) {
    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "en", "404.html"));
  }
});

app.get("/de/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (reservedSlugs.includes(slug) || reservedSlugs.includes(`${slug}.html`)) {
      return next();
    }

    const checkPaths = [
      path.join(__dirname, "..", "de", slug),
      path.join(__dirname, "..", "de", `${slug}.html`)
    ];
    const fileExists = checkPaths.some(checkPath => fs.existsSync(checkPath));

    if (fileExists) {
      return next();
    }

    const link = await Link.findOne({ slug: slug });
    if (link) {
      return res.sendFile(path.join(WEBSITE_ROOT, "de", "unlock.html"));
    }

    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "de", "404.html"));
  } catch (err) {
    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "de", "404.html"));
  }
});

app.get("/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (reservedSlugs.includes(slug) || reservedSlugs.includes(`${slug}.html`)) {
      return next();
    }

    const checkPaths = [
      path.join(__dirname, "..", slug),
      path.join(__dirname, "..", `${slug}.html`)
    ];
    const fileExists = checkPaths.some(checkPath => fs.existsSync(checkPath));

    if (fileExists) {
      return next();
    }

    const link = await Link.findOne({ slug: slug });
    if (link) {
      return res.sendFile(path.join(WEBSITE_ROOT, "unlock.html"));
    }

    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "404.html"));
  } catch (err) {
    return res.status(404).sendFile(path.join(WEBSITE_ROOT, "404.html"));
  }
});

app.get("/", (req, res) => {
  const packId = req.query.pack || req.query.id;
  if (packId) {
    return servePackHtml(req, res, packId);
  }
  const html = getIndexHtml();
  if (html) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
  res.send("API Działa poprawnie");
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  try {
    console.error(new Date().toISOString(), err && err.message ? err.message : "Unknown error");
  } catch (_) { }
  res.status(403).send("Not Found");
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(WEBSITE_ROOT, "404.html"));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});