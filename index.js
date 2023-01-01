require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
var dns = require('dns');
const nanoid = require('nanoid');
const url = require('url');
const validate = require('validate.js');

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

const TIMEOUT = 10000;
const db = process.env['MONGO_URI'];
var Url;


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

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
    type: String,
    unique: true,
    default: () => nanoid()
  }
});

//Create index
urlSchema.index({ original_url: 1, short_url: 1 });

/** Create and Save a url */
Url = mongoose.model("Url", urlSchema);

app.post("/api/shorturl", function (req, res, next) {
  let t = setTimeout(() => {
    next({ message: "timeout" });
  }, TIMEOUT);

  const urlToTest = req.body.url;

  try {
    //TODO evaluate other libraries for validation
    if (validate({website: urlToTest }, {website: {url: true}}) !== undefined)        throw new Error('Invalid URL');

    const urlObject = new URL(urlToTest);

    dns.lookup(urlObject.hostname, (err, address, family) => {
      if (err) throw err;
    
      if (mongoose && mongoose.connection.readyState) {
        Url.findOne({original_url: urlToTest})
        .then(urlFound => {
          if (urlFound) return urlFound;
          return Url.create({'original_url': urlToTest}); 
        })
        .then(url => {
          const {original_url, short_url} = url;

          res.status(200).json({ original_url : original_url, short_url : short_url });
        })
        .catch(err => res.status(200).json({ error: err.message }));

      } else {
        throw new Error('Could not connect to the database.');
      }
    })
  }catch (error) {
    console.log(error);
    res.status(200).json({ error: error.message });
  }
  
});

app.get('/api/shorturl/:url', (req, res, next) => {
  const { url } = req.params;
  Url.findOne({ short_url: url })
  .then(url => {
    if (!url) { throw new Error('invalid url'); }
    res.redirect(url.original_url);
   })
   .catch(err => res.status(200).json({ error: err.message }));
});