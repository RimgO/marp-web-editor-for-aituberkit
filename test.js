const assert = require('assert');
let scripts = [ { page: 0, line: 'test' } ];
let text = JSON.stringify([], null, 2);

try {
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(scripts)) {
    console.log("Will set text");
  } else {
    console.log("Will NOT set text");
  }
} catch {
  console.log("Will set text (catch)");
}
