const fs = require("fs");

//給予位址，刪除檔案
const deleteFile = (filepath) => {
  fs.unlink(filepath, (err) => {
    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;
