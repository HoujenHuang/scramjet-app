"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const transportSelect = document.getElementById("sj-transport");
const frameContainer = document.getElementById("frame-container");

function setCookie(name, value) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const savedEngine = getCookie("pref_engine");
if (savedEngine) searchEngine.value = savedEngine;

const savedTransport = getCookie("pref_transport");
if (savedTransport) transportSelect.value = savedTransport;

searchEngine.addEventListener("change", () => setCookie("pref_engine", searchEngine.value));
transportSelect.addEventListener("change", () => setCookie("pref_transport", transportSelect.value));

const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const btnReload = document.getElementById("btn-reload");

let currentFrame = null;

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
    files: {
        wasm: "/scram/scramjet.wasm.wasm",
        all: "/scram/scramjet.all.js",
        sync: "/scram/scramjet.sync.js",
    },
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

btnBack.addEventListener("click", () => {
    if (currentFrame?.frame?.contentWindow) {
        currentFrame.frame.contentWindow.history.back();
    }
});

btnForward.addEventListener("click", () => {
    if (currentFrame?.frame?.contentWindow) {
        currentFrame.frame.contentWindow.history.forward();
    }
});

btnReload.addEventListener("click", () => {
    if (currentFrame) {
        currentFrame.frame.contentWindow.location.reload();
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        await registerSW();
    } catch (err) {
        console.error("SW failed:", err);
        return;
    }

    const url = search(address.value, searchEngine.value);
    const selectedTransport = transportSelect.value;

    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";

    if ((await connection.getTransport()) !== selectedTransport) {
        await connection.setTransport(selectedTransport, [{ websocket: wispUrl }]);
    }

    document.body.classList.add("is-active");

    if (!currentFrame) {
        currentFrame = scramjet.createFrame();
        currentFrame.frame.id = "sj-frame";
        frameContainer.appendChild(currentFrame.frame);
    }

    currentFrame.go(url);
    address.blur();
});
