const fs = require('fs');
const comm = require('../common/common');
const zlib = require('zlib');

module.exports = {
    /**
     * @description 디렉토리가 없을 시 생성하는 함수
     * @param {*} path 저장할 디렉토리 경로
     */
    makeDirectory: function(path) {

        // 폴더가 존재하는지 확인 후 로직 실행
        this.searchFolder(path).then((files) => {
            if (files === undefined) this.createFolder(path);
        });
    },

    /**
     * @description 폴더를 생성하는 함수
     * @param {*} path 폴더를 생성할 경로
     */
    createFolder: function(path) {
        fs.mkdir(path, {recursive: true, mode: 0777}, function (err) {
            if (err) {
                comm.errorHandling('not create new directory!', err);
            } else {
                console.log('create new directory');
            }
        });
    },

    /**
     * @description 폴더가 존재하는지 찾는 함수
     * @param {*} path 찾을 폴더 경로 및 이름
     * @returns 찾은 파일들
     */
    searchFolder: function(path) {
        return new Promise((resolve, reject) => {
            fs.readdir(path, function (err, files) {

                if (err) {
                    console.log('not search directory');
                    resolve(files);
                    return;
                }

                console.log('search directory ' + path);
            });
        });
    },

    /**
     * @description 폴더를 삭제하는 함수
     * @param {*} path 삭제할 폴더경로
     */
    removeFile: function(path) {
        fs.unlink(path, function (err) {

            if (err) {
                comm.errorHandling('Unable to remove file!', err);
                return;
            }

            console.log("remove file");
        });
    },

    /**
     * @description 파일을 압축하는 함수
     * @param {*} path 저장할 파일경로
     * @param {*} fileName 저장할 파일이름
     */
    compact: function(path, file) {
        let fileName = file.substring(0, file.lastIndexOf(".txt"));   // 확장자 제거
        let today = comm.getToday();

        if (fileName.length === 0) return;

        fs.createReadStream(path + file)
        .pipe(zlib.createGzip())
        .on('data', () => process.stdout.write('compact ing...\n'))
        .pipe(fs.createWriteStream(path + fileName + '_' + today.split(' ')[0] + '.gz'))
        .on('finish', () => {
            console.log('Compact Finished');
            if (file.indexOf('gz') < 0) this.removeFile(path + file);   // 압축한 원본파일을 삭제(압축파일 제외)
        });
    },

    getFileInfo: function (path, file) {
        return new Promise((resolve, reject) => {
            fs.stat(path + file, function (err, stats) {
                // 파일 정보가 하나도 없을 경우
                if (err) {
                    console.log(path + file + '파일정보가 없습니다!');
                    fs.appendFile(
                        path + file,
                        '',
                        (err) => {
                            if (err) {
                                comm.errorHandling('Failed to add content to the file!', err);
                                return;
                            }
                        });
                } else {
                    resolve(stats);
                }
            });
        });
    },
};