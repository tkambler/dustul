module.exports = {
    'config': {
        'consul': {
            'host': '192.168.50.2',
            'port': 8500
        }
    },
    'watch': {
        'cities': {
            'method': 'kv.get',
            'options': {
                'key': 'config/env-app/cities',
                'recurse': false
            },
            'filter': 'json'
        }
    },
    'context': {
    },
    'beforeRender': (context) => {
        context.date = new Date();
    },
    'command': 'echo',
    'args': ['hello world'],
    'destination': 'output.tpl',
    'template': `
        <p>Hello, world.</p>
        {#cities}
            {.}
        {/cities}
        {@contextDump/}
    `
};
