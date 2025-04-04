TradeTrack
TradeTrack on verkkosovellus, joka auttaa käyttäjiä seuraamaan osakkeiden hintakehitystä reaaliajassa ja asettamaan hälytyksiä, kun osakkeen hinta ylittää tai alittaa ennalta määritellyt rajat. Sovellus on suunniteltu yksityissijoittajille, osakekauppiaille ja rahoitusalan ammattilaisille, jotka haluavat pysyä ajan tasalla sijoituksistaan ilman jatkuvaa markkinoiden tarkkailua.

Ominaisuudet:
    Osaketietojen haku: Hae osakkeiden tietoja reaaliajassa Alpha Vantage -API:n avulla.

    Hälytykset: Aseta hälytyksiä, kun osakkeen hinta ylittää tai alittaa määritetyn rajan.

    Suositut osakkeet: Selaa suosittujen osakkeiden listaa ja valitse niitä klikkaamalla.

    Hintakehitys: Näytä valitun osakkeen hintakehitys interaktiivisella viivakaaviolla.

    Responsiivinen design: Sovellus toimii moitteettomasti eri laitteilla (tietokoneet, tabletit, puhelimet).

Teknologiat:    
    Frontend: HTML, CSS, JavaScript, Chart.js

    Backend: Node.js, Express.js

Tietokanta: 
    MongoDB

API: 
    Alpha Vantage (osaketiedot)

Sähköpostihälytykset: 
    Nodemailer

Asennus:
Kloonaa repositorio:
git clone https://github.com/käyttäjä/TradeTrack.git
cd TradeTrack

Asenna riippuvuudet:
# Projektin alustaminen
npm init -y
# Riippuvuuksien asennus (backend)
npm install express mongoose body-parser cors nodemailer dotenv node-fetch
# Riippuvuuksien poistaminen
npm uninstall node-fetch
# Asenna node-fetch versio 2.x (koska versio 3.x vaatii ESM-moduuleja)
npm install node-fetch@2
# Projektin käynnistäminen
node server.js
# Kehitysmoodissa käynnistäminen (nodemon)
npm install -g nodemon
nodemon server.js
# Riippuvuuksien päivittäminen
npm update
# Riippuvuuksien listaaminen
npm list
# Riippuvuuksien korjaaminen (jos node_modules on korruptoitunut)
npm install
# Turvallisuusongelmien tarkistaminen
npm audit
# Turvallisuusongelmien korjaaminen
npm audit fix
Luo .env-tiedosto:
Luo .env-tiedosto projektin juureen ja lisää seuraavat 

ympäristömuuttujat:
    .env
    ALPHA_VANTAGE_API_KEY=sinun_api_avain
    EMAIL_USER=sinun_sähköpostisi@gmail.com
    EMAIL_PASSWORD=sinun_sähköpostisi_salasana
    MONGODB_URI=mongodb://localhost:27017/tradetrack
Käynnistä backend:
    node server.js
Avaa sovellus selaimessa:
    Avaa index.html selaimessa tai käynnistä kehityspalvelin (esim. Live Server).

Käyttöohje
Selaa suosittuja osakkeita:
    Vasemmalla puolella on lista suosituista osakkeista. Klikkaa osaketta nähdäksesi sen tiedot ja hintakehityksen.

Hae osakkeita:
    Syötä osakkeen symboli (esim. AAPL) hakukenttään ja paina "Hae".

Aseta hälytyksiä:
    Syötä hinta, jolla haluat hälytyksen, ja paina "Aseta hälytys".

Tarkastele hintakehitystä:
    Valitun osakkeen hintakehitys näkyy interaktiivisessa viivakaaviossa.

Kehitysympäristö
    Node.js: v20.x
    MongoDB: v6.x (Lataaminen https://www.mongodb.com/try/download/community)
    Selain: Chrome, Firefox, Edge (uusin versio)

Lisenssi
Tämä projekti on lisensoitu MIT-lisenssillä.

Tekijät
    Othman Al-Kubaisi
    Omar Al-Kubaisi
    Ivan Jirki

Kiitokset
    Alpha Vantage ilmaisesta osaketietojen API:sta.
    Chart.js interaktiivisten kaavioiden luomisesta.

Kontribuointi
Jos haluat osallistua projektin kehittämiseen, tee seuraava:
    Forkkaa projekti.
    Luo uusi haara (git checkout -b feature/uusi-ominaisuus).
    Tee muutokset ja committaa ne (git commit -m 'Lisää uusi ominaisuus').
    Puske haara GitHubiin (git push origin feature/uusi-ominaisuus).
    Luo pull request.

Tulevaisuuden suunnitelmat
    Käyttäjäautentikointi: Lisää kirjautumisjärjestelmä käyttäjille.
    Historialliset tiedot: Näytä osakkeiden historialliset tiedot kaaviossa.
    Moniomaiset hälytykset: Lisää mahdollisuus saada hälytyksiä sähköpostin lisäksi tekstiviestinä.

Jos sinulla on kysyttävää tai ehdotuksia, ota yhteyttä!