const cheerio = require('cheerio')
const axios = require('axios');
const express = require('express')
const app = express()
const nodeExcel = require('node-xlsx');
const urlencode = require('urlencode');

function getData(time, language) {
    let url = 'http://supin.58.com/pc/list';  // 拼接请求的页面链接
    return axios.get(url)
        .then(function (response) {
            let html_string = response.data.toString(); // 获取网页内容
            const $ = cheerio.load(html_string);  // 传入页面内容
            let list_array = [];
            let fetchList = [];
            $('.list .list-item').each(function () { // 像jQuery一样获取对应节点值
                let obj = {};
                const jobid = $(this).find('.item-jobid').attr('value');
                fetchList.push(getJobDetail(jobid));
            });

            return Promise.all(fetchList).then((data) => {
                return data;
            }).catch(() => {});

        })
        .catch(function (error) {
            console.log(error);
        })
}

const getJobDetail = function (jobid) {
    return axios.get('http://supin.58.com/pc/detail/msb/' + jobid + '.html').then(function (response) {
        
        let html_string = response.data.toString();
        const $ = cheerio.load(html_string);
        const obj = {
            job_name: $('.job-name').text().trimStart().trimEnd(),
            job_salary: $('.job-salary').find('.job-salary-num').text().trimStart().trimEnd(),
            job_tag: [],
            job_item: [],
            job_desc: $('.job-info-desc').text().trimStart().trimEnd(),
            job_com: $('.com-info-desc').text().trimStart().trimEnd(),
        };

        $('.job-tag .job-tag-item').each((index, item) => {
            obj.job_tag.push($(item).text());
        });

        $('.job-item').each((index, item) => {
            const combinedJobItem = {
                title: $(item).find('.job-item-tit').text(),
            };
            // jd相关信息
            if ($(item).find('.job-item-con').text()) {
                combinedJobItem.content = $(item).find('.job-item-con').text();
            } else if ($(item).find('.job-req-item').text()) {
                const zContent = [];
                $(item).find('.job-req-item').each((zIndex, zItem) => {
                    zContent.push($(zItem).text());
                });
                combinedJobItem.content = zContent;
            } else if ($(item).find('.iv-date').text()) {
                const dContent = [];
                $('.iv-item').each((zIndex, zItem) => {
                    dContent.push($(zItem).find('.iv-date').text() + ' ' + $(zItem).find('.iv-time').text());
                });
                combinedJobItem.content = dContent;
            }
            obj.job_item.push(combinedJobItem);
        });
        
        return Promise.resolve(obj);
    });
}

app.get('/', (req, res) => {
    // let promise = getData('daily'); // 发起抓取
    // promise.then(response => {
    //     res.json(response); // 数据返回
    // });
    res.end('<a href="/download">下载excle</a>')
})

const config = {
    job_name: '职位名称',
    job_salary: '岗位薪资',
    job_tag: '职位要求',
    job_desc: '职位描述',
    job_com: '公司信息'
};

const exportExcel = function (res, obj) {
    let excelConfig = [];
    const objArray = Array.prototype.slice.call(obj);
    // 标题部分
    let titleArray = [];
    Object.keys(objArray[0]).forEach(key => {
        if (key === 'job_item') {
            objArray[0][key].forEach(zItem => {
                titleArray.push(zItem.title.replace('：', ''));
            });
        } else {
            titleArray.push(config[key].replace('：', ''));
        }
    });
    excelConfig.push(titleArray);
    // 内容部分
    objArray.forEach(item => {
        let contentArray = [];
        Object.keys(item).forEach(key => {
            if (key === 'job_item') {
                item[key].forEach(zItem => {
                    contentArray.push(zItem.content);
                });
            } else {
                contentArray.push(item[key]);
            }
        });
        excelConfig.push(contentArray);
        console.log(contentArray)
    });
    const excelName = '速聘-爬虫';
    let buffer = nodeExcel.build([{name: excelName, data: excelConfig}]);
    res.setHeader('Content-Type', 'application/octet-stream');
     // ctx.request.headers['user-agent']
    let name = urlencode(excelName + '_' + (+new Date()) + '.xlsx', "utf-8");
    res.setHeader("Content-Disposition", "attachment; filename* = UTF-8''"+name);    
    // res.setHeader("Content-Disposition", "attachment; filename="+ (+new Date()) + '.xlsx');
    res.end(buffer);
}

app.get('/download', (req, res) => {
    let promise = getData('daily');
    promise.then(response => {
        exportExcel(res, response);
    });
})

app.get('/:time', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.end('<a href="/download">下载excle</a>')
})

app.listen(3000, () => console.log('Listening on port 3000!'))  // 监听3000端口
