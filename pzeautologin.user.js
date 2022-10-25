// ==UserScript==
// @name        POLSL PZE Autologin
// @namespace   https://github.com/PixelHir
// @match       http*://platforma*.polsl.pl/*
// @version     1.0.5
// @author      Jędrzej Gortel (github.com/PixelHir)
// @require     https://code.jquery.com/jquery-3.6.0.slim.min.js
// @require     https://cdn.jsdelivr.net/npm/simple-crypto-js@2.5.0/dist/SimpleCrypto.min.js
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.deleteValue
// @downloadURL https://github.com/PixelHir/POLSL-PZE-Autologin/raw/master/pzeautologin.user.js
// @updateURL   https://github.com/PixelHir/POLSL-PZE-Autologin/raw/master/pzeautologin.user.js
// @description Skrypt pozwalający na automatyczne logowanie do PZE Politechniki Śląskiej
// ==/UserScript==

(function () {
    'use strict';
    const subdomainregex = /platforma[1-9]?\.polsl\.pl/i;
    const depregex = /\/([a-zA-Z0-9]+)\//;

    function isLoggedIn() {
        return document.getElementsByClassName('avatar current').length > 0
    }

    function login(firstTime) {
        GM.getValue("__pzeautologin_enc")
            .then((value) => {
                let key = value;
                if (!value) {
                    console.log("no encryption key in memory. generating one.")
                    key = SimpleCrypto.generateRandom(256);
                    GM.setValue("__pzeautologin_enc", key);
                }
                var simpleCrypto = new SimpleCrypto(key);
                Promise.all([GM.getValue("pzeautologin_username"), GM.getValue("pzeautologin_password")])
                    .then((values) => {
                        var username = values[0];
                        var password = values[1];
                        if (username == undefined || password == undefined) {
                            console.log("no username or password in memory. setup process begins")
                            setupProcess(simpleCrypto);
                            login(1);
                            return;
                        } else {
                            console.log("username and password found in memory. logging in")
                            if (document.referrer.endsWith("/login/index.php") && !firstTime) {
                                if (window.confirm("Chyba podane dane nie działają, czy chcesz wyczyścić swoje dane logowania? Jeśli wszystko jest ok to kliknij anuluj i nastąpi próba ponownego logowania.")) {
                                    clearData();
                                    location.reload();
                                }
                            }
                            try {
                                var username = simpleCrypto.decrypt(username);
                                var password = simpleCrypto.decrypt(password);
                                $("input#username").val(username);
                                $("input#password").val(password);
                                setTimeout(clickLoginBtn, 50);
                            } catch (err) {

                                console.log(err);
                                alert("Wystąpił błąd przy odszyfrowaniu loginu i hasła z pamięci. Nastąpi wyczyszczenie pamięci i przejście do konfiguracji.");
                                clearData();
                                location.reload();
                            }
                        }
                    })

            });
    }

    function clearData() {
        GM.deleteValue("__pzeautologin_enc");
        GM.deleteValue("pzeautologin_username");
        GM.deleteValue("pzeautologin_password");
    }

    function setupProcess(simpleCrypto) {
        alert("PZE AUTOLOGIN\n\nWykryto pierwsze uruchomienie skryptu do autologowania.\nPrzejdziesz teraz do logowania.\nPodane dane są przechowywane jedynie w pamięci twojej przeglądarki, w formie zaszyfrowanej.");
        var username = prompt("Podaj swój login:");
        if (username == null) {
            alert("Nie podano loginu. Musisz go podać albo wyłączyć skrypt.");
            return;
        }
        var password = prompt("Podaj swoje hasło:");
        if (password == null) {
            alert("Nie podano loginu. Musisz go podać albo wyłączyć skrypt.");
            return;
        }
        username = simpleCrypto.encrypt(username);
        password = simpleCrypto.encrypt(password);
        //GM.setValue("pzeautologin_username", username);
        //GM.setValue("pzeautologin_password", password);
        Promise.all([GM.setValue("pzeautologin_username", username), GM.setValue("pzeautologin_password", password)])
        .then(() => {
          console.log('data saved')
        });
    }

    function clickLoginBtn() {
        $("button#loginbtn").click()
    }

    function loginRedirect(dep) {
        window.location.href = 'https://' + dep + '/login/index.php';
    }
    
    function isPathIgnored(path) {
        return /resource|file|pdf/.test(path);
    }

    var host = window.location.host;
    var path = window.location.pathname
    const pzehostmatch = subdomainregex.test(host);
    let depinfo;
    if (pzehostmatch) {
        depinfo = depregex.exec(path);
    }
    if (pzehostmatch && depinfo != null && path.startsWith("/" + depinfo[1] + "/login/index.php")) {
        console.log('user is on login page!')
        window.addEventListener('load', (event) => {
            login()
        });
      // really dirty, if you have better method then please do a PR
    } else if (pzehostmatch && depinfo != null && !isPathIgnored(path)) {
        console.log('user is on department page')
        if (isLoggedIn()) {
            console.log('user is logged in')
        } else {
            console.log('user is not logged in')
            loginRedirect(host + "/" + depinfo[1]);
        }
    }


})();
