import React from 'react';
import { ShieldCheck, FileText } from 'lucide-react';

export const LegalPage = ({ type = 'privacy' }) => {
  const isPrivacy = type === 'privacy';

  return (
    <div className="container" style={{ padding: '4rem 1.5rem 6rem', maxWidth: 840 }}>
      <div className="section-header">
        <div className="section-badge">
          {isPrivacy ? <ShieldCheck size={14} /> : <FileText size={14} />}
          <span>Prawne</span>
        </div>
        <h1 className="section-title">
          {isPrivacy ? 'Polityka Prywatności' : 'Regulamin Serwisu'}
        </h1>
        <p className="section-subtitle">
          {isPrivacy
            ? 'Zasady ochrony prywatności i przetwarzania danych w serwisie BarleyTxT.pl'
            : 'Warunki korzystania z platformy i pobierania zasobów'}
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        {isPrivacy ? (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>1. Informacje ogólne</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych użytkowników korzystających z serwisu BarleyTxT.pl. Dokładamy wszelkich starań, aby Twoje dane były bezpieczne.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>2. Gromadzone dane</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Serwis gromadzi zanonimizowane statystyki odwiedzin, liczby pobrań texturepacków oraz preferencje językowe zapisane lokalnie w przeglądarce użytkownika (localStorage). Nie gromadzimy danych wrażliwych ani numerów kart płatniczych.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>3. Pliki Cookies i pamięć lokalna</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Używamy pamięci lokalnej (Local Storage) do zapamiętania Twojego wybranego języka oraz stanu odblokowanych paczek, co zapewnia wygodne korzystanie z serwisu.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>4. Kontakt</h3>
            <p>
              W sprawach związanych z polityką prywatności możesz skontaktować się z nami pod adresem e-mail: <strong>contact@barleytxt.pl</strong> lub za pośrednictwem naszego serwera Discord.
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>1. Postanowienia wstępne</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Korzystanie z serwisu BarleyTxT.pl oznacza akceptację niniejszego Regulaminu. Serwis oferuje bezpłatny dostęp do autorskich paczek zasobów do gry Minecraft.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>2. Własność intelektualna</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Wszystkie autorskie tekstury, grafiki oraz nazwy paczek należą do ich odpowiednich twórców. Minecraft jest znakiem towarowym firmy Mojang Studios i Microsoft. Serwis BarleyTxT.pl nie jest oficjalnie powiązany z Mojang Studios.
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>3. Warunki pobierania</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Pobieranie paczek jest bezpłatne. W przypadku paczek chronionych linkami promocyjnymi, pobranie może wymagać wykonania prostych kroków społecznościowych (np. subskrypcja kanału YouTube).
            </p>

            <h3 style={{ color: '#ffffff', marginBottom: '0.75rem', fontSize: '1.25rem' }}>4. Zmiany w regulaminie</h3>
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w Regulaminie. Aktualna wersja jest zawsze dostępna pod tym adresem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
