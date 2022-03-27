"use strict";

/**
 * Correct Jest bug that prevents the Firestore tests from running. More info here:
 * https://github.com/firebase/firebase-js-sdk/issues/3096#issuecomment-637584185
 */

const BrowserEnvironment = require("jest-environment-jsdom");
const LZUTF8 = require("lzutf8");
// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getStorage, ref } = require("firebase/storage");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAilhi-2LbjUom9ijMVttzL3poVwV42j3U",
  authDomain: "jsdom-debugger.firebaseapp.com",
  projectId: "jsdom-debugger",
  storageBucket: "jsdom-debugger.appspot.com",
  messagingSenderId: "313875416562",
  appId: "1:313875416562:web:ebff9a186c3f935b6b176b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const snapshots = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MyEnvironment extends BrowserEnvironment {
  constructor(config) {
    super(
      Object.assign({}, config, {
        globals: Object.assign({}, config.globals, {
          Uint32Array: Uint32Array,
          Uint8Array: Uint8Array,
          ArrayBuffer: ArrayBuffer,
        }),
      })
    );
  }

  takeSnapshot() {
    const currentHtml = this.global.document.documentElement.innerHTML;

    if (currentHtml !== snapshots[snapshots.length - 1]) {
      const compressed = LZUTF8.compress(
        this.global.document.documentElement.innerHTML,
        {
          outputEncoding: "Base64",
        }
      );

      snapshots.push(compressed);
    }
  }

  async setup() {
    this.debugger_running = true;

    (async () => {
      while (this.debugger_running) {
        await sleep(1);

        this.takeSnapshot();
      }
    })();
  }

  async teardown() {
    this.takeSnapshot();

    this.debugger_running = false;

    const stringified = JSON.stringify(snapshots);

    const compressed = LZUTF8.compress(stringified, {
      outputEncoding: "Base64",
    });

    const storage = getStorage();
    const storageRef = ref(storage);

    // 'file' comes from the Blob or File API
    await uploadBytes(storageRef, compressed);
  }
}

module.exports = MyEnvironment;