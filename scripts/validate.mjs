import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("extension");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const expected = ["content.js", "manifest.json", "popup.css", "popup.html", "popup.js"];
assert.deepEqual((await readdir(root)).sort(), expected.sort(), "Unexpected extension payload");
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["storage"], "Review any permission expansion");
assert.deepEqual(manifest.content_scripts, [{
  matches: ["http://*/*", "https://*/*"], js: ["content.js"],
  run_at: "document_start", all_frames: true, world: "ISOLATED"
}]);
for (const field of ["background", "host_permissions", "optional_permissions", "externally_connectable", "web_accessible_resources"]) {
  assert.equal(manifest[field], undefined, `Review new capability: ${field}`);
}
assert.equal(manifest.action.default_popup, "popup.html");
assert.equal(manifest.content_security_policy.extension_pages,
  "script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none'");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.version, JSON.parse(await readFile("package.json", "utf8")).version);
const html = await readFile(resolve(root, "popup.html"), "utf8");
assert.match(html, /<script src="popup\.js" defer><\/script>/);
assert.match(html, /href="popup\.css"/);
assert.doesNotMatch(html, /\son[a-z]+\s*=|<script[^>]*>\s*\S+\s*<\/script>/i, "Inline script or handler");
console.log("Manifest, minimal permissions, CSP and extension payload: PASS");
