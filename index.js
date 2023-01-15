require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
var dns = require('dns');
const url = require('url');
const validate = require('validate.js');
const bodyParser = require('body-parser');

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

const TIMEOUT = 10000;
const db = process.env['MONGO_URI'];
var Url;

mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, autoIndex: false });


// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

/** Create a 'Url' Model */
const urlSchema = new Schema({
  original_url: {
    type: String,
    unique: true
  },
  short_url: {
    type: Number,
    unique: true,
  }
});

//Create index
urlSchema.index({ original_url: 1, short_url: 1 });

/** Create and Save a url */
Url = mongoose.model("Url", urlSchema);

app.post("/api/shorturl", function(req, res, next) {
  let t = setTimeout(() => {
    next({ message: "timeout" });
  }, TIMEOUT);

  const urlToTest = req.body.url;

  try {
    //TODO evaluate other libraries for validation
    if (validate({ website: urlToTest }, { website: { url: true } }) !== undefined) throw new Error('Invalid URL');

    const urlObject = new URL(urlToTest);

    dns.lookup(urlObject.hostname, (err, address, family) => {
      clearTimeout(t);
      if (err) throw err;
      // Check for existing short url
      Url.findOne({ original_url: urlToTest }, (err, data) => {
        if (err) throw err;
        if (data) {
          return res.json({ original_url: data.original_url, short_url: data.short_url });
        }
        // Create new short url
        Url.countDocuments({}, (err, count) => {
          if (err) throw err;
          const newUrl = new Url({
            original_url: urlToTest,
            short_url: count + 1
          });
          newUrl.save((err) => {
            if (err) throw err;
            return res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
          });
        });
      });
    });
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

app.get("/api/shorturl/:short_url", function(req, res, next) {
  Url.findOne({ short_url: req.params.short_url }, (err, data) => {
    if (err) throw err;
    if (!data) {
      return res.json({ error: 'invalid short url' });
    }
    return res.redirect(data.original_url);
  });
});
