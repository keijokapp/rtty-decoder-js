var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');

var bundler;

appBundler = watchify(browserify('./src/app.js', watchify));

function bundle() {
  return bundler
    .transform(babelify)
    .bundle()
    .on('error', function(err) { console.log('Error: ' + err.message); })
    .pipe(source(config.outputFile))
    .pipe(gulp.dest(config.outputDir))
}

gulp.task('build', function() {
  return appBundler
    .transform(babelify)
    .bundle()
    .on('error', function(err) { console.log('Error: ' + err.message); })
    .pipe(source('app.js'))
    .pipe(gulp.dest('dist'))
});

gulp.task('watch', ['build' ], function() {
  appBundler.on('update', function() {
    gulp.start('build')
  });
});
