const { ServiceBroker } = require("moleculer");

const GSheetReporter = require("./gsheet-reporter");

const broker = new ServiceBroker({
    nodeID: "node-001",
    logger: {
        type: "Console",
        options: {
            formatter: "short"
        }
    },

    metrics: {
        enabled: true,
        reporter: new GSheetReporter({
            includes: ["os.cpu.utilization", "os.memory.**", "moleculer.request.total", "moleculer.request.time"],
            sheetID: "1kclCzscTkQhzCmK59NLNKcIRYiNWLWsrVpzZEC336_M",
            credentials: require("./credentials.json")
        })
    }
});

broker.createService({
    name: "greeter",
    actions: {
        hello(ctx) {
            return "Hello GSheet";
        },

        welcome(ctx) {
            return "Welcome, GSheet";
        }
    }
});

broker.start().then(() => {
    broker.repl();
    
    callRandomAction();
}).catch(err => broker.logger.error(err));

const actions = ["greeter.hello", "greeter.welcome"];
function callRandomAction() {
    const action = actions[Math.floor(Math.random() * actions.length)];
    broker.call(action);

    setTimeout(callRandomAction, 1000 + Math.random() * 1000);
}