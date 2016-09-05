# Dustul

## Introduction

Dustul is a [Dust](http://www.dustjs.com/)-based an alternative to [consul-template](https://github.com/hashicorp/consul-template). It allows you
to subscribe to changes within [Consul](https://www.consul.io/) and render templates (using Dust template syntax) to disk as they occur. After rendering occurs, one or more commands can also be executed (e.g. `service nginx restart`, etc...).

## Getting Started

Dustul is a command-line utility. As such, it should be installed globally via `npm i -g dustul`. Afterwards, getting started is a simple matter of creating a configuration file, as shown below.

Take note:

- The file should export an array of configuration objects, allowing you to define one or more templates to be rendered.
- Dustul relies on npm's [consul](https://github.com/silas/node-consul) package for interactions with Consul. For more information on the symantics that are used for defining subscriptions, see that project's documentation.

``` javascript
// config.js
module.exports = [
    {
        'config': {
        	/**
        	 * Consul options
        	 */
            'consul': {
                'host': '192.168.50.2',
                'port': 8500
            }
        },
        /**
         * The context object to be passed to Dust as Consul changes occur.
         * Here you can define context helpers, pre-defined data, etc...
         */
        'context': {
        },
        /**
         * Consul subscriptions are defined here. As changes occur, incoming data is processed
         * and assigned to the context object using the associated key. For example, our cities
         * subscription will be processed and stored at context.cities.
         */
        'watch': {
        	/**
        	 * Subscribe to changes within Consul's key / value store.
        	 */
            'cities': {
                'method': 'kv.get',
                'options': {
                    'key': 'config/env-app/cities',
                    'recurse': false
                },
                /**
                 * Optional callback. Allows you to manipulate incoming data before it is stored
                 * within the context object.
                 */
                'cb': (data) => {
                    return JSON.parse(data.Value);
                }
            },
            /**
             * Subscribe to a list of available Consul nodes.
             */
            'nodes': {
                'method': 'catalog.node.list'
            },
            /**
             * Subscribe to a list of available Consul services.
             */
            'services': {
                'method': 'catalog.service.list'
            },
            /**
             * Subscribe to a list of available Consul nodes for a specific service.
             */
            'consul_nodes': {
                'method': 'catalog.service.nodes',
                'options': {
                    'service': 'consul'
                }
            }
        },
        /**
         * This function is called just before Dust rendering occurs. Here you
         * can make final modifications to your context object.
         */
        'beforeRender': (consul, context) => {
            context.date = new Date();
        },
        /**
         * Whether or not to trim whitespace from the beginning and end of the rendered template
         * before saving to disk. Default: false
         */
        'trim': true,
        /**
         * An array of commands (and corresponding arguments) to be executed after rendering
         * has completed. Values for command, args, and options are passed to Node's process.spawn
         * method. Commands are run in order as a sequence.
         */
        'commands': [
            {
                'command': 'service',
                'args': ['nginx', 'restart'],
                'options': {}
            }
        ],
        /**
         * The path at which the rendered template will be saved. Relative paths
         * are considered relative to the location at which Dustul is executed. You'd be better
         * off sticking with absolute paths.
         */
        'destination': '/etc/nginx/sites-enabled/my-site.conf',
        /**
         * The Dust template
         */
        'template': `
            upstream my_upstream {
                {#consul_nodes}
                    server {Address};
                {/consul_nodes}
            }
            
            server {
                listen 80;
                location / {
                    proxy_pass http://my_upstream;
                }
            }
        `
    }
];
```

Next, call Dustul and provide it with the path to your configuration file, as shown below.

``` bash
$ dustul subscribe -c ./config.js
```

## Limitations &amp; Desired Contributions

At the moment, Dustul only allows you to subscribe to changes within Consul's key value store. Short-term plans including adding support for subscribing to service and node changes, as well.

## Related Resources

- [Consul](https://www.consul.io/)
- [consul-template](https://github.com/hashicorp/consul-template)
- [Dust](http://www.dustjs.com/)
- [node-consul](https://github.com/silas/node-consul)