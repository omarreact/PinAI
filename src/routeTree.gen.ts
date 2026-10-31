/* eslint-disable */

// @ts-nocheck

// This file was generated from the PinAI route set. The TanStack Router plugin
// regenerates it automatically during development and production builds.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as WorkspaceRouteImport } from './routes/workspace'
import { Route as AiRouteImport } from './routes/ai'
import { Route as ApiAiStatusRouteImport } from './routes/api/ai/status'
import { Route as ApiAiStreamRouteImport } from './routes/api/ai/stream'
import { Route as ApiAiConversationsRouteImport } from './routes/api/ai/conversations'
import { Route as ApiAiConversationsIdRouteImport } from './routes/api/ai/conversations.$id'
import { Route as ApiAuthSplatRouteImport } from './routes/api/auth/$'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

const WorkspaceRoute = WorkspaceRouteImport.update({
  id: '/workspace',
  path: '/workspace',
  getParentRoute: () => rootRouteImport,
} as any)

const AiRoute = AiRouteImport.update({
  id: '/ai',
  path: '/ai',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAiStatusRoute = ApiAiStatusRouteImport.update({
  id: '/api/ai/status',
  path: '/api/ai/status',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAiStreamRoute = ApiAiStreamRouteImport.update({
  id: '/api/ai/stream',
  path: '/api/ai/stream',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAiConversationsRoute = ApiAiConversationsRouteImport.update({
  id: '/api/ai/conversations',
  path: '/api/ai/conversations',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAiConversationsIdRoute = ApiAiConversationsIdRouteImport.update({
  id: '/api/ai/conversations/$id',
  path: '/api/ai/conversations/$id',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAuthSplatRoute = ApiAuthSplatRouteImport.update({
  id: '/api/auth/$',
  path: '/api/auth/$',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/workspace': typeof WorkspaceRoute
  '/ai': typeof AiRoute
  '/api/ai/status': typeof ApiAiStatusRoute
  '/api/ai/stream': typeof ApiAiStreamRoute
  '/api/ai/conversations': typeof ApiAiConversationsRoute
  '/api/ai/conversations/$id': typeof ApiAiConversationsIdRoute
  '/api/auth/$': typeof ApiAuthSplatRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/workspace': typeof WorkspaceRoute
  '/ai': typeof AiRoute
  '/api/ai/status': typeof ApiAiStatusRoute
  '/api/ai/stream': typeof ApiAiStreamRoute
  '/api/ai/conversations': typeof ApiAiConversationsRoute
  '/api/ai/conversations/$id': typeof ApiAiConversationsIdRoute
  '/api/auth/$': typeof ApiAuthSplatRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/workspace': typeof WorkspaceRoute
  '/ai': typeof AiRoute
  '/api/ai/status': typeof ApiAiStatusRoute
  '/api/ai/stream': typeof ApiAiStreamRoute
  '/api/ai/conversations': typeof ApiAiConversationsRoute
  '/api/ai/conversations/$id': typeof ApiAiConversationsIdRoute
  '/api/auth/$': typeof ApiAuthSplatRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/workspace' | '/ai' | '/api/ai/status' | '/api/ai/stream' | '/api/ai/conversations' | '/api/ai/conversations/$id' | '/api/auth/$'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/workspace' | '/ai' | '/api/ai/status' | '/api/ai/stream' | '/api/ai/conversations' | '/api/ai/conversations/$id' | '/api/auth/$'
  id: '__root__' | '/' | '/workspace' | '/ai' | '/api/ai/status' | '/api/ai/stream' | '/api/ai/conversations' | '/api/ai/conversations/$id' | '/api/auth/$'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  WorkspaceRoute: typeof WorkspaceRoute
  AiRoute: typeof AiRoute
  ApiAiStatusRoute: typeof ApiAiStatusRoute
  ApiAiStreamRoute: typeof ApiAiStreamRoute
  ApiAiConversationsRoute: typeof ApiAiConversationsRoute
  ApiAiConversationsIdRoute: typeof ApiAiConversationsIdRoute
  ApiAuthSplatRoute: typeof ApiAuthSplatRoute
}
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/workspace': {
      id: '/workspace'
      path: '/workspace'
      fullPath: '/workspace'
      preLoaderRoute: typeof WorkspaceRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/ai': {
      id: '/ai'
      path: '/ai'
      fullPath: '/ai'
      preLoaderRoute: typeof AiRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/ai/status': {
      id: '/api/ai/status'
      path: '/api/ai/status'
      fullPath: '/api/ai/status'
      preLoaderRoute: typeof ApiAiStatusRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/ai/stream': {
      id: '/api/ai/stream'
      path: '/api/ai/stream'
      fullPath: '/api/ai/stream'
      preLoaderRoute: typeof ApiAiStreamRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/ai/conversations': {
      id: '/api/ai/conversations'
      path: '/api/ai/conversations'
      fullPath: '/api/ai/conversations'
      preLoaderRoute: typeof ApiAiConversationsRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/ai/conversations/$id': {
      id: '/api/ai/conversations/$id'
      path: '/api/ai/conversations/$id'
      fullPath: '/api/ai/conversations/$id'
      preLoaderRoute: typeof ApiAiConversationsIdRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/auth/$': {
      id: '/api/auth/$'
      path: '/api/auth/$'
      fullPath: '/api/auth/$'
      preLoaderRoute: typeof ApiAuthSplatRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}
const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  WorkspaceRoute: WorkspaceRoute,
  AiRoute: AiRoute,
  ApiAiStatusRoute: ApiAiStatusRoute,
  ApiAiStreamRoute: ApiAiStreamRoute,
  ApiAiConversationsRoute: ApiAiConversationsRoute,
  ApiAiConversationsIdRoute: ApiAiConversationsIdRoute,
  ApiAuthSplatRoute: ApiAuthSplatRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
