const CodeToKey = require("./keys").CodeToKey;
const issuerMap = require("./iin").issuer;

const lineSeparator = "\n";

const defaultOptions = { suppressErrors: false };

exports.parse = function parseDL(str, options) {
  if (!options) { options = defaultOptions };
  const props = {};
  // New line after identification number
  str = str.replace(/(.*?(?:DL|ID).*?(?:DL|ID))(.*)/, "$1\n$2");
  const rawLines = str.trim().split(lineSeparator);
  const lines = rawLines.map(function (rawLine) { return sanitizeData(rawLine); });
  let started;

  lines.forEach(function (line) {
    if (!started) {
      if (line.indexOf("ANSI ") === 0) {
        started = true;
        props["iin"] = line.slice(5, 11); // 6-digit Issuer Identification Numbers
        props["issuerState"] = issuerMap[props["iin"]] || "UNKNOWN";
      }
      return;
    }

    let code = getCode(line);
    let value = getValue(line);
    let key = getKey(code);
    if (!key) {
      if (options.suppressErrors || code === "ZNZ" || code === "ZAZ") {
        return;
      } else {
        throw new Error("unknown code: " + code);
      }
    }

    if (isSexField(code)) value = getSex(code, value);
    props[key] = value;
  });

  // date format depends on issuer
  const issuer = issuerMap[props["iin"]]
  // If issuer exists, it must be Canadian IIN
  const getDateFormat = issuer ? getDateFormatCAN : getDateFormatUSA;

  for (let key in props) {
    if (isDateField(key)) {
      props[key] = getDateFormat(props[key]);
    }
  }

  return props;
};

const sanitizeData = function (rawLine) { return rawLine.match(/[\011\012\015\040-\177]*/g).join('').trim(); };

const getCode = function (line) { return line.slice(0, 3); }
const getValue = function (line) { return line.slice(3) }
const getKey = function (code) { return CodeToKey[code] }

const isSexField = function (code) { return code === "DBC" };

const getSex = function (code, value) {
  if (value === "1" || value === "M") {
    return "M";
  } else if (value === "2" || value === "F") {
    return "F";
  }
  return "X";
};

const isDateField = function (key) { return key.indexOf("date") === 0; }

const getDateFormatUSA = function (value) {
  const parts = [value.slice(0, 2), value.slice(2, 4), value.slice(4)];
  return parts.join("/");
};

const getDateFormatCAN = function (value) {
  const parts = [value.slice(0, 4), value.slice(4, 6), value.slice(6)];
  return parts.join("/");
};



