var gTeamData = [];
var gPersonalData = [];

var gShootTypeData = getEmptyStatDictionary();
var gShootCourseSuccess = getEmptyStatDictionary();
var gShootCourseFailed = getEmptyStatDictionary();
var gShootTypeChart;

function getEmptyStatDictionary() {
  return { _total: 0 };
}

function safeMapGet(map, key) {
  if (map[key]) {
    return map[key];
  } else {
    return 0;
  }
}

function isInclude(targets, str) {
  for (const i in targets) {
    if (
      targets[i]
        .toString()
        .toUpperCase()
        .indexOf(str) > -1
    ) {
      return true;
    }
  }
  return false;
}

function convertCSVtoArray(str) {
  var results = [];
  var lines = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成

  var labels = lines[0].split(",");

  // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
  for (var i = 1; i < lines.length; ++i) {
    var result = {};
    if (lines[i] == "") {
      break;
    }
    var tmp = lines[i].split(",");
    for (var j in labels) {
      result[labels[j]] = tmp[j];
    }
    results.push(result);
  }
  return results;
}

function countData(container, key) {
  if (container["_total"]) {
    container["_total"]++;
  } else {
    container["_total"] = 1;
  }

  if (container[key]) {
    container[key]++;
  } else {
    container[key] = 1;
  }
  return container;
}

var gPersonalDataTables;
var gTeamDataTables;
function makePersonalData() {
  var table = $("#personal-data");

  if (gPersonalDataTables) {
    gPersonalDataTables.clear();
  } else {
    gPersonalDataTables = table.DataTable({
      order: [[2, "desc"]],
      searching: false,
      paging: false,
      info: false
    });
  }

  var allTotal = 0;
  var allSuccess = 0;
  for (var i = 0; i < gPersonalData.length; i++) {
    var data = gPersonalData[i];
    gPersonalDataTables.row.add([
      data.name,
      data._total,
      data._success,
      Math.round((data._success / data._total) * 100) + "%"
    ]);
    allTotal += data._total;
    allSuccess += data._success;
  }
  gPersonalDataTables.draw();
  $("#shoot-success-all").text(
    "全体シュート成功率: " +
      Math.round((allSuccess / allTotal) * 100) +
      "%  (" +
      allSuccess +
      "/" +
      allTotal +
      ")"
  );
}

function makeTeamData() {
  var table = $("#team-data");

  gTeamDataTables = table.DataTable();
  table.on("search.dt", function() {
    var displayed = gTeamDataTables.rows({ filter: "applied" }).data();

    gShootTypeData = getEmptyStatDictionary();
    gPersonalData = [];
    gShootCourseSuccess = getEmptyStatDictionary();
    gShootCourseFailed = getEmptyStatDictionary();

    for (var i = 0; i < displayed.length; i++) {
      countData(gShootTypeData, displayed[i][1]);
      if (displayed[i][3] == "true") {
        countData(gShootCourseSuccess, displayed[i][2]);
      } else {
        countData(gShootCourseFailed, displayed[i][2]);
      }

      var element = gPersonalData.find(function(p) {
        return p.name === displayed[i][0];
      });
      if (!element) {
        element = {
          name: displayed[i][0],
          _total: 0,
          _success: 0,
          _failed: 0
        };
        gPersonalData.push(element);
      }
      element._total++; // count
      if (displayed[i][3] == "true") {
        element._success += 1; // sum
      } else {
        element._failed += 1;
      }
    }
    updateCharts();
  });

  for (var i = 0; i < gTeamData.length; i++) {
    var data = gTeamData[i];
    gTeamDataTables.row.add([
      data.name,
      data.shootType,
      data.shootCourse,
      data.shootResult,
      data.gameDate,
      data.penalty,
      data.vs,
      data.class
    ]);
  }
  gTeamDataTables.draw();
}

function updateCharts() {
  makeHeatmap($("#heat-map tbody td").not(".stats-title"), function(item) {
    var val = 0;

    var count =
      safeMapGet(gShootCourseSuccess, item.attr("id")) +
      safeMapGet(gShootCourseFailed, item.attr("id"));
    if (count) {
      val =
        (count / (gShootCourseSuccess._total + gShootCourseFailed._total)) *
        100;
    }
    return {
      val: val,
      text: Math.round(val) + "%",
      text:
        Math.round(val) +
        "% (" +
        count +
        "/" +
        (gShootCourseSuccess._total + gShootCourseFailed._total) +
        ")"
    };
  });
  makeHeatmap($("#success-heat-map tbody td").not(".stats-title"), function(
    item
  ) {
    var val = 0;
    var success = safeMapGet(gShootCourseSuccess, item.attr("id"));
    var failed = safeMapGet(gShootCourseFailed, item.attr("id"));

    if (success) {
      val = (success / (success + failed)) * 100;
    }
    return {
      val: val,
      text: Math.round(val) + "% (" + success + "/" + (success + failed) + ")"
    };
  });

  makeCircleChart(gShootTypeChart, gShootTypeData);
  makePersonalData();
}

$(document).ready(function() {
  var req = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
  req.open("get", "./data/data.csv", true); // アクセスするファイルを指定
  req.send(null); // HTTPリクエストの発行

  gShootTypeChart = {
    target: $("#shoot-type-chart"),
    data: gShootTypeData
  };
  // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ
  req.onload = function() {
    gTeamData = convertCSVtoArray(req.responseText); // 渡されるのは読み込んだCSVデータ
    makeTeamData();
    updateCharts();
  };
});

function makeHeatmap(tableCollection, funcGetValue) {
  var max = 100;
  // 色を指定する
  xr = 255;
  xg = 255;
  xb = 255;

  yr = 80;
  yg = 243;
  yb = 30;

  n = 100; // 各データポイントをループして、その％の値を計算する
  tableCollection.each(function() {
    // set value
    var ret = funcGetValue($(this));
    var val = ret.val;
    var text = ret.text;

    $(this).text(text);
    var pos = parseInt(Math.round((val / max) * 100).toFixed(0));
    red = parseInt((xr + (pos * (yr - xr)) / (n - 1)).toFixed(0));
    green = parseInt((xg + (pos * (yg - xg)) / (n - 1)).toFixed(0));
    blue = parseInt((xb + (pos * (yb - xb)) / (n - 1)).toFixed(0));
    clr = "rgb(" + red + "," + green + "," + blue + ")";
    $(this).css({
      backgroundColor: clr
    });
  });
}

function makeCircleChart(chartInfo, chartData) {
  var labelAndData = [],
    labels = [],
    data = [];

  for (key in chartData) {
    if (key == "_total") {
      continue;
    }
    labelAndData.push([key, chartData[key]]);
  }

  labelAndData.sort(function(a, b) {
    return b[1] - a[1];
  });

  for (i in labelAndData) {
    labels.push(labelAndData[i][0]);
    data.push(labelAndData[i][1]);
  }

  var datasets = [
    {
      backgroundColor: [
        "#004529",
        "#006837",
        "#238443",
        "#41ab5d",
        "#78c679",
        "#addd8e",
        "#d9f0a3",
        "#f7fcb9",
        "#ffffe5"
      ],
      data: data
    }
  ];

  if (chartInfo._chart) {
    chartInfo._chart.data = {
      labels: labels,
      datasets: datasets
    };
    chartInfo._chart.update();
  } else {
    chartInfo._chart = new Chart(chartInfo.target, {
      type: "pie",
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        plugins: {
          labels: [
            {
              render: "percentage",
              position: "outside"
            }
          ]
        }
      }
    });
  }
}

$.fn.dataTableExt.afnFiltering.push(function(oSettings, aData, iDataIndex) {
  var keywords = $(".dataTables_filter input")
    .val()
    .split(" ");
  var matches = 0;
  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];
    for (var col = 0; col < aData.length; col++) {
      if (aData[col].indexOf(keyword) > -1) {
        matches++;
        break;
      }
    }
  }
  return matches == keywords.length;
});
