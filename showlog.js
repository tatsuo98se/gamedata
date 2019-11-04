const aws = require("aws-sdk");
const csv = require("csv-parser");
const stream = require("memory-streams");
const readline = require("readline");
const s3 = new aws.S3();
fs = require("fs");

const gBucket = "hasudaclub-jr";

var params = {
  Bucket: gBucket,
  Prefix: "logs/"
};

var contents = [];

async function getS3Content() {
  var content = [];

  if (fs.existsSync("./log/lastKey")) {
    var str = fs.readFileSync("./log/lastKey");
    params["StartAfter"] = fs.readFileSync("./log/lastKey").toString();
  } else {
    if (fs.existsSync("./log/logs.txt")) {
      fs.unlinkSync("./log/logs.txt");
    }
  }

  while (true) {
    var c = await s3.listObjectsV2(params).promise();
    process.stdout.write(".");
    content = content.concat(c.Contents);
    if (!c.IsTruncated) {
      break;
    }
    params["ContinuationToken"] = c.NextContinuationToken;
  }
  return content;
}

//s3.listObjectsV2(params, function(err, data) {
getS3Content()
  .then(function(data) {
    if (data.length == 0) {
      return;
    }
    //data.Contents.forEach(content => {    console.log(data + "aa");
    fs.writeFileSync("./log/lastkey", data[data.length - 1].Key);

    var contents = [];
    data.forEach(content => {
      process.stdout.write("*");
      contents.push(
        s3.getObject({ Bucket: gBucket, Key: content.Key }).promise()
      );
    });
    return Promise.all(contents);
  })
  .then(function(data) {
    if (data) {
      var filteredLogs = [];
      data.forEach(obj => {
        var linesOfLog = obj.Body.toString().split("\n");

        linesOfLog.forEach(log => {
          if (log.length <= 0) {
            return;
          }
          if (log.includes("S3Console")) {
            return;
          }
          if (log.includes("aws-cli")) {
            return;
          }
          // if (log.includes("124.85.201.176")) {
          //   return;
          // }
          if (log.includes("aws-internal")) {
            return;
          }
          if (log.includes("aws-sdk-nodejs")) {
            return;
          }
          if (log.includes("console.aws.amazon.com/s3")) {
            return;
          }
          logdata = log.split(" ");
          var date = logdata[2].substr(1, logdata[2].length);
          date = date.replace(":", " ");
          date = new Date(date);

          var outlog = "";
          for (var j = 4; j < logdata.length; j++) {
            outlog += " " + logdata[j];
          }
          filteredLogs.push({ date: date, log: outlog });
        });
      });

      filteredLogs.sort(function(a, b) {
        a.date.getTime() < b.date.getTime();
      });
      filteredLogs.forEach(logstr => {
        fs.appendFileSync(
          "./log/logs.txt",
          logstr.date.getTime() + " " + logstr.log + "\n",
          "utf-8"
        );
      });
    }
    return "./log/logs.txt";
  })
  .then(function(data) {
    console.log(data);
    fs.createReadStream(data)
      .pipe(csv({ separator: " ", headers: false }))
      .on("data", function(data) {
        console.log(
          new Date(parseInt(data[0], 10)) + " " + data[2] + " " + data[15]
        );
      })
      .on("end", function() {});
  })
  .catch(function(err) {
    console.log(err);
  });

// parse logs
