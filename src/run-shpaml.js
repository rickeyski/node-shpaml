var shpaml = require("../lib/shpaml").SHPAML,
  nopt = require("nopt"),
  fs = require("fs"),
  
  opt = {
    'outfile': Boolean,
    'version': Boolean
  },
  parsed = nopt(opt);

function die(why) {
  'use strict';
  console.warn(why);
  console.warn("Usage: " + process.argv[1] + " file.shpaml ...");
  process.exit(1);
}

function convertFile(file) {
  'use strict';
  var ft = file.split('.');

  fs.readFile(file, function (err, data) {
    if (err) {
      console.error(err);
    } else {
      // Fix UTF8 with BOM
      if (0xEF === data[0] && 0xBB === data[1] && 0xBF === data[2]) {
        data = data.slice(3);
      }

      data = data.toString("utf8");

      if (parsed.outfile) {
        fs.writeFile(ft[0] + '.html', shpaml.convert_text(data), function (err) {
          if (err) {
            console.error(err);
          }
        });
      } else {
        console.log(shpaml.convert_text(data));
      }
    }
  }); 
}
if (parsed.version) {
  console.log(shpaml.version);
  process.exit(0);
} else if (!parsed.argv.remain.length) {
  die("No files specified.");
}

parsed.argv.remain.forEach(convertFile);
