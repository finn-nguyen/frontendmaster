var url = require('url');
var request = require('request');
var fs = require('fs');
var path = require('path');
var progress = require('request-progress');
var ProgressBar = require('progress');
var API_BASE = require('./config').API_BASE_URL;
var VIDEO_URLS = [];
var TOTAL_COMPLETED = 0;
var TOTAL_VIDEOS;
var cookieText =
  '__stripe_mid=428695c8-0b0c-4925-8c91-de0ca94baddc; edd_wp_session=8ccdf7d0a2579b710f405c4ab5722ee4%7C%7C1511981730%7C%7C1511979930; wordpress_logged_in_323a64690667409e18476e5932ed231e=hprobotic_gmail.com%7C1512111330%7Cv6q4engnNHXuinElm8oVp3YGpHkicC9EvRa6tKQouqW%7C5c2632ba6590e3d4fc451fc5a7e6d3cc637c968c419e796b4d0470bdd89a53a4; _ga=GA1.2.391603729.1511935532; _gid=GA1.2.984189477.1511935532; intercom-id-w1ukcwje=05852cff-c7fd-42da-97a5-b24bec3f6576';

var boot = function(courseUrl) {
  var options = {
    url: API_BASE + url.parse(courseUrl).pathname,
    headers: {
      'User-Agent': 'request',
      host: '.frontendmasters.com',
      cookie: cookieText //this is where you set custom cookies
    }
  };
  courseUrl = API_BASE + url.parse(courseUrl).pathname;
  request(options, function(error, response, body) {
    if (error) {
      console.log(error);
    } else {
      processCourseInfo(body);
    }
  });
};

var processCourseInfo = function(body) {
  var videos, directory;

  try {
    body = JSON.parse(body);
  } catch (Exception) {
    body = body;
  }

  directory = __dirname + '/videos/' + body.title;

  // Create a video directory if not exists
  directory.split('/').forEach((dir, index, splits) => {
    const parent = splits.slice(0, index).join('/');
    const dirPath = path.resolve(parent, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });
  //resorce download and write on the txt file.
  if (body.resources) {
    var resorce_file_name = directory + '/' + body.slug + '.txt';
    var logger = fs.createWriteStream(resorce_file_name, {
      flags: 'a' // 'a' means appending (old data will be preserved)
    });
    body.resources.map(function(obj, index) {
      logger.write(
        '==========================================================' + '\r\n'
      );
      logger.write(index + ')  ' + obj.label + '\r\n'); // append string to your file
      logger.write(obj.url + '\r\n');
      logger.write(
        '==========================================================' + '\r\n'
      );
    });
    logger.end();
  }
  // Grab Lesson Data
  if (body.lessonData) {
    videos = body.lessonData.map(function(obj, index) {
      var seq = index + 1,
        url = API_BASE + '/video/' + obj.statsId + '/source?r=720&f=webm',
        destination = directory + '/' + seq + ' - ' + obj.slug + '.webm',
        title = obj.slug;
      const direct = getDirectLink(url);
      return {
        url: url,
        destination: destination,
        title: title,
        direct: direct
      };
    });
  }
  VIDEO_URLS = videos;
  console.log(VIDEO_URLS[0]);
  startDownloading(VIDEO_URLS[0]);
};
var getDirectLink = function(url) {
  var options = {
    method: 'GET',
    url: url,
    headers: {
      referer: 'https://frontendmasters.com',
      host: '.frontendmasters.com',
      cookie: cookieText //this is where you set custom cookies
    }
	};
	let direct = ''
  request(options, function(error, response, body) {
    if (error) {
      console.log(error);
      
    } else {
      direct = JSON.parse(body).url;
    }
	});
	return direct
};

var startDownloading = function(video) {
  console.log('direct link: ', video.direct);
  if (fs.existsSync(video.destination)) {
    TOTAL_COMPLETED++;
    startDownloading(VIDEO_URLS[TOTAL_COMPLETED]);
    return false;
  }
  var video_download = {
    url: video.direct,
    headers: {
      'User-Agent': 'request',
      host: '.frontendmasters.com',
      cookie: cookieText //this is where you set custom cookies
    }
  };
  request(video_download)
    .on('response', function handleResponse(res) {
      var total = Number(res.headers['content-length']) || null;
      var progressBar = new ProgressBar(
        'Downloading ' + video.title + '[:bar] :rate/bps :percent :etas',
        {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: total
        }
      );

      res.on('data', function(chunk) {
        progressBar.tick(chunk.length);
      });
    })
    .on('end', function() {
      TOTAL_COMPLETED++;
      startDownloading(VIDEO_URLS[TOTAL_COMPLETED]);
    })
    .pipe(fs.createWriteStream(video.destination));
};

module.exports.boot = boot;
