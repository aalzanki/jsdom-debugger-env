"use strict";

/**
 * Correct Jest bug that prevents the Firestore tests from running. More info here:
 * https://github.com/firebase/firebase-js-sdk/issues/3096#issuecomment-637584185
 */

const BrowserEnvironment = require("jest-environment-jsdom").default;
const LZUTF8 = require("lzutf8");
// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} = require("firebase/storage");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const makeId = (length = 10, includeLetters = true) => {
  let result = "";

  const characters = includeLetters
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    : "0123456789";

  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

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
  constructor(config, context) {
    super(
      Object.assign({}, config, {
        globals: Object.assign({}, config.globals, {
          Uint32Array: Uint32Array,
          Uint8Array: Uint8Array,
          ArrayBuffer: ArrayBuffer,
        }),
      }),
      context
    );

    this.total_tests_runs = 0;
  }

  takeSnapshot() {
    const currentHtml = this.global.document.documentElement.outerHTML;

    if (currentHtml !== snapshots[snapshots.length - 1]) {
      snapshots.push(this.global.document.documentElement.outerHTML);
    }
  }

  async setup() {
    this.debugger_running = true;
    await super.setup();
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

    if (this.total_tests_runs === 1) {
      const stringified = JSON.stringify(snapshots);

      const storage = getStorage();
      const storageRef = ref(storage, makeId(20));

      // 'file' comes from the Blob or File API

      await uploadString(storageRef, stringified);

      const url = await getDownloadURL(storageRef);

      // `url` is the download URL for 'images/stars.jpg'

      // This can be downloaded directly:
      console.log(
        `

---------------------------------------
---------------------------------------
JSDOM Debugger URL: https://jsdom-debugger.vercel.app/snapshots?storageUrl=${encodeURIComponent(
          url
        )}
---------------------------------------
---------------------------------------

        `
      );
    }
    await super.teardown();
  }
  async handleTestEvent(event) {
    if (
      event &&
      event.name === "test_fn_start" &&
      event.test &&
      event.test.type === "test" &&
      event.test.status !== "skip" &&
      event.test.mode === "only"
    ) {
      this.total_tests_runs++;
    }
  }
  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = MyEnvironment;
