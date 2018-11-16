import HTTPServer, { HTTPServerOptions } from 'highoutput-http-server';
import { ApolloServer } from 'apollo-server-koa';

export interface GraphQLServerOptions {
  typeDefs: any;
  resolvers: any;
}

export default class GraphQLServer extends HTTPServer {
  constructor(protected options: HTTPServerOptions & GraphQLServerOptions) {
    super(options);

    const server = new ApolloServer(options);

    server.applyMiddleware({ app: this.app });
  }
}
