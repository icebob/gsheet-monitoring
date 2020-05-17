const _ = require("lodash");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const BaseReporter = require("moleculer").MetricReporters.Base;
const { humanize } = require("moleculer").Utils;

/**
 * Poor man's monitoring solution. A thought provoking project
 * 
 * https://theoephraim.github.io/node-google-spreadsheet/#/
 * 
 *  API managing:
 *      https://console.developers.google.com/apis/credentials?showWizardSurvey=true&project=moleculer-monitoring&organizationId=0
 * 
 */
class GSheetReporter extends BaseReporter {

	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
            interval: 5,
            sheetID: null,
            credentials: null
		});

		this.lastChanges = new Set();
	}

	/**
	 * Initialize reporter.
     * 
	 * @param {MetricRegistry} registry
	 */
	async init(registry) {
		super.init(registry);

        await this.connect();
        if (this.doc) {
            // Start timer
            if (this.opts.interval > 0) {
                this.timer = setTimeout(() => this.update(), this.opts.interval * 1000);
                this.timer.unref();
            }
        }
    }
    
    async connect() {
        try {
            this.doc = new GoogleSpreadsheet(this.opts.sheetID);
            await this.doc.useServiceAccountAuth(this.opts.credentials);
            await this.doc.loadInfo();
            this.logger.info(`Connected to the '${this.doc.title}' sheet.`);
        } catch(err) {
            this.logger.error("Unable to connect to the sheet", err);
            this.doc = null;
        }
    }

    /**
     * Update values in the Google Spreadsheet. 
     */
    async update() {
        const startTime = Date.now();
        try {

            const list = this.registry.list({
                includes: this.opts.includes,
                excludes: this.opts.excludes,
            });

            if (list.length == 0)
                return;        
            
            for (let metric of list) {
                if (metric.values.length == 0) continue;

                // Get sheet
                const sheet = await this.getSheet(metric.name);

                // Update header
                if (!sheet.headerValues || sheet.headerValues.length == 0) {
                    await sheet.setHeaderRow(this.getSheetHeaders(metric, metric.values[0]));
                }

                // Get important cells
                await sheet.loadCells({
                    startRowIndex: 1, endRowIndex: 20/*, startColumnIndex:1, endColumnIndex: 3*/
                });        
                
                for (let item of metric.values) {

                    const rowIndex = this.findRowIndex(sheet, item.key);

                    
                    if (rowIndex == null) {
                        const cells = this.getCellValues(metric, item, false);
                        await sheet.addRow(cells);
                    } else {
                        const cells = this.getCellValues(metric, item, true);
                        // Update cells
                        const valueIndex = 3 + metric.labelNames.length + 1;

                        // Update timestamp
                        const timeCell = sheet.getCell(rowIndex, valueIndex - 1);
                        timeCell.value = this.convertTimestamp(item.timestamp);

                        // Update values
                        for (let i = 0; i < cells.length; i++) {
                            const valueCell = sheet.getCell(rowIndex, valueIndex + i);
                            valueCell.value = cells[i];
                        }

                        await sheet.saveUpdatedCells();
                    }
                }
            }
            
            this.logger.info(`Updated in ${humanize(Date.now() - startTime)}`);
        } catch(err) {
            this.logger.error("Unable to update metrics", err);
        }
        this.timer = setTimeout(() => this.update(), this.opts.interval * 1000);
        this.timer.unref();
    }

    getCellValues(metric, item, onlyValues) {
        const cells = onlyValues ? [] : [
            metric.name,
            this.broker.nodeID,
            item.key,
            ...metric.labelNames.map(label => item.labels[label]),
            this.convertTimestamp(item.timestamp)
        ];

        switch(metric.type) {
            case "counter":
            case "gauge":
                cells.push(item.value);
                if (item.rate)
                    cells.push(item.rate);

                break;

            case "histogram": 
                if (item.rate)
                    cells.push(item.rate);

                cells.push(item.min);
                cells.push(item.mean);
                cells.push(item.max);

                if (item.quantiles) {
                    cells.push(...Object.values(item.quantiles))
                }
                break;
        }

        return cells;
    }

    getSheetHeaders(metric, item) {
        const cells = [
            "Metric",
            "NodeID",
            "LabelKey",
            ...metric.labelNames,
            "Timestamp"
        ];

        switch(metric.type) {
            case "counter":
            case "gauge":
                cells.push("Value");
                if (item.rate)
                    cells.push("Rate");

                break;

            case "histogram": 
                if (item.rate)
                    cells.push("Rate");

                cells.push("Minimum");
                cells.push("Mean");
                cells.push("Maximum");

                if (item.quantiles) {
                    cells.push(...Object.keys(item.quantiles).map(s => `q=${s}`))
                }
                break;
        }

        return cells;        
    }

    findRowIndex(sheet, key) {
        if (key == "") key = null;

        let row;
        for (let i = 1; i <= 10; i++) {
            const nodeID = sheet.getCell(i, 1);
            const cellKey = sheet.getCell(i, 2);

            if (nodeID.value == this.broker.nodeID && cellKey.value == key) {
                row = i;
                break;
            }
        }

        return row;
    }

    convertTimestamp(value) {
        return (value + 2209161600000) / 86400 / 1000;
    }

    async getSheet(name) {
        let sheet = this.doc.sheetsByIndex.find(sh => sh.title == name);
        if (!sheet) {
            sheet = this.doc.addSheet({
                title: name
            });
            this.logger.info(`New sheet '${name}' created.`);
        }

        if (!sheet.headerValues) {
            // Try to load header row
            try {
                await sheet.loadHeaderRow();
            } catch(err) {
                // Silent
            }
        }

        return sheet;
    }
}

module.exports = GSheetReporter;