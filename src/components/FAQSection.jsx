import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const FAQSection = () => {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState(null);

  const faqs = [
    {
      id: 1,
      q: 'Gdzie znajdę Wasze paczki tekstur?',
      a: 'Wszystkie paczki znajdziesz w naszym oficjalnym Katalogu na stronie oraz bezpośrednio na dedykowanym serwerze Discord.'
    },
    {
      id: 2,
      q: 'Jak pobrać wybraną paczkę?',
      a: 'Wybierz interesujący Cię texturepack w katalogu, kliknij w jego kartę, a następnie wybierz „Pobierz Paczkę”. Po krótkim procesie weryfikacji link do pobrania zostanie natychmiast odblokowany.'
    },
    {
      id: 3,
      q: 'Jak zmienić wersję paczki tekstur?',
      a: 'Skorzystaj z naszego darmowego Konwertera Wersji. Wgraj plik .zip z paczką, wybierz docelową wersję gry Minecraft, a system automatycznie przekształci strukturę i plik pack.mcmeta.'
    },
    {
      id: 4,
      q: 'Co zrobić, gdy tekstury nie działają w grze?',
      a: 'Upewnij się, że paczka w formacie .zip znajduje się w folderze .minecraft/resourcepacks. Wiele modeli wymaga modyfikacji OptiFine lub Iris/CIT Resewn oraz włączonej opcji „Custom Items” w ustawieniach graficznych.'
    }
  ];

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  const arrowSvg = (
    <svg fill="currentColor" viewBox="0 0 320 512" height="1rem" width="1rem" xmlns="http://www.w3.org/2000/svg">
      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
    </svg>
  );

  return (
    <section className="faq" id="faq">
      <div className="faq-header">
        <div className="faq-left">
          <div className="information-badge">FAQ</div>
          <h3 className="faq-title">
            Najczęściej <span>Zadawane Pytania</span>
          </h3>
          <p className="faq-text">
            Odpowiedzi na najczęstsze pytania dotyczące pobierania i instalacji paczek. Jeśli nie znalazłeś odpowiedzi na swoje pytanie, napisz do nas na Discordzie!
          </p>
        </div>

        <div className="faq-right">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className={`faq-item ${isOpen ? 'active' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggle(faq.id)}
                >
                  <span>{faq.q}</span>
                  <span
                    className="arrow"
                    style={{ transform: isOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  >
                    {arrowSvg}
                  </span>
                </button>
                <div
                  className="faq-answer"
                  style={{
                    maxHeight: isOpen ? '12.5rem' : '0',
                    padding: isOpen ? '1rem' : '0 1rem'
                  }}
                >
                  <p>{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
