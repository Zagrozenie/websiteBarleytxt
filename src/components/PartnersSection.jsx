import React from 'react';
import { SkinCanvas } from './SkinCanvas';

export const PartnersSection = () => {
  const partners = [
    { name: 'Shogyy', skin: 'shogyy', subs: '80.3k Subskrypcji', url: 'https://youtube.com/@Shogyy' },
    { name: 'glock18kulawleb', skin: 'glock18kulawleb', subs: '46.1k Subskrypcji', url: 'https://www.youtube.com/@glock18kulawlebYT' },
    { name: 'xRaxenikk', skin: 'xRaxenikk', subs: '112k Subskrypcji', url: 'https://www.youtube.com/@xRaxenikk' },
    { name: 'rzabek', skin: 'rzabek', subs: '107k Subskrypcji', url: 'https://www.youtube.com/@rzabekkk' },
    { name: 'DziadekWedkarz', skin: 'DziadekWedkarz', subs: '4.34k Subskrypcji', url: 'https://www.youtube.com/@DziadekWedkarz23' },
    { name: 'EndereG', skin: 'Endereg', subs: '27k Subskrypcji', url: 'https://www.youtube.com/@EndereGG' },
    { name: 'Zombiaczekkk', skin: 'Zombiaczekkk', subs: '106k Subskrypcji', url: 'https://www.youtube.com/@Zombiaczekkk' },
    { name: 'A5B1SS', skin: 'A5B1SS', subs: '33.5k Subskrypcji', url: 'https://www.youtube.com/@A5B1SS' },
    { name: 'nitro798', skin: 'nitro798', subs: '82 Subskrypcje', url: 'https://www.youtube.com/@nitro7987' }
  ];

  // In the original design, the list of partners is duplicated so the 50% slider CSS animation loops seamlessly
  const allPartners = [...partners, ...partners];

  const ytIcon = (
    <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <path d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z" />
    </svg>
  );

  return (
    <section className="partners">
      <div className="partners-header">
        <div className="information-badge">Współpraca</div>
        <h3 className="texturepacks-popular-title">Nasi Partnerzy</h3>
        <p className="texturepacks-popular-text">Poznaj utalentowanych twórców współpracujących z BarleyTxT</p>
      </div>

      <div className="partners-container">
        <div className="partners-section">
          {allPartners.map((partner, index) => (
            <a
              key={index}
              href={partner.url}
              target="_blank"
              rel="noreferrer"
              className="partners-card"
            >
              <h3>{partner.name}</h3>
              <SkinCanvas skinName={partner.skin} />
              <div className="partner-subs-badge">
                {ytIcon}
                <span>{partner.subs}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

    </section>
  );
};
