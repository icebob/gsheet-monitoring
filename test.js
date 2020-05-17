/**
 * Articles:
 *      https://developers.google.com/sheets/api/quickstart/nodejs 
 *      https://blog.stephsmith.io/tutorial-google-sheets-api-node-js/
 *      http://codingfundas.com/how-to-read-edit-google-sheets-using-node-js/index.html
 *      
 * 
 * API managing:
 *      https://console.developers.google.com/apis/credentials?showWizardSurvey=true&project=moleculer-monitoring&organizationId=0
 */

const { GoogleSpreadsheet } = require("google-spreadsheet");

// spreadsheet key is the long id in the sheets URL
const doc = new GoogleSpreadsheet("1kclCzscTkQhzCmK59NLNKcIRYiNWLWsrVpzZEC336_M");

(async function() {
// use service account creds
await doc.useServiceAccountAuth(require("./credentials.json"));

await doc.loadInfo(); // loads document properties and worksheets
console.log("Loaded doc: "+doc.title);

const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
// console.log(sheet.title);
// console.log(sheet.rowCount);

/*
const rows = await sheet.getRows({
    limit: 2
});

console.log("Rows", rows);

*/

//sheet.addRow(["A3","B3"]);


setInterval(async () => {
    await sheet.loadCells('A1:F3');

    const F2 = sheet.getCellByA1("F2");
    F2.value = new Date().toISOString();
    await sheet.saveUpdatedCells();
}, 2000);

/*
// create a sheet and set the header row
const sheet = await doc.addSheet({ headerValues: ['name', 'email'] });

// append rows
const larryRow = await sheet.addRow({ name: 'Larry Page', email: 'larry@google.com' });
*/
/*
, () => {
    doc.getInfo(function(err, info) {
		if( err )
			return console.log("Error: "+err);

		console.log("Loaded doc: "+info.title+" by "+info.author.email);

		const sheet = info.worksheets[0];
		console.log("sheet 1: "+sheet.title+" "+sheet.rowCount+" x "+sheet.colCount);

		sheet.getRows({
			offset: 1,
			limit: 2,
			//orderby: "col2"
		}, function( err, rows ){
			if( err )
				return console.log("Error: "+err);
			console.log("Read "+rows.length+" rows");

			rows.forEach(row => {
				//console.log(row);
			});
			console.log(rows);
            
			sheet.getCells({
				"min-row": 3,
				"min-col": 1,
				"max-row": 5,
				"max-col": 33,
				"return-empty": true,
			}, function(err, cells) {
				console.log("Read" + cells.length + " cells");
            });
            
		});
	});
});
*/

})();