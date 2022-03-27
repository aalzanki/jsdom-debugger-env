"use strict";

/**
 * Correct Jest bug that prevents the Firestore tests from running. More info here:
 * https://github.com/firebase/firebase-js-sdk/issues/3096#issuecomment-637584185
 */

const BrowserEnvironment = require("jest-environment-jsdom");
const LZUTF8 = require("lzutf8");

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
    console.log(snapshots);

    this.debugger_running = false;

    const stringified = JSON.stringify(snapshots);

    const compressed = LZUTF8.compress(stringified, {
      outputEncoding: "Base64",
    });

    console.log("http://localhost:3000?data=" + compressed);
  }
}

module.exports = MyEnvironment;
