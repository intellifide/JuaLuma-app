# Developer SDK Guide

## Overview
The Finity Developer SDK allows developers to build custom widgets for the Finity dashboard.

## Installation
Currently, the SDK types are available within the `frontend/src/sdk` directory.

## Core Types

### WidgetContext
Provides the environment context for the widget.
```typescript
interface WidgetContext {
  theme: 'light' | 'dark';
  currency: string;
  locale: string;
}
```

### FinityClient
Provides a safe interface for making API requests.
```typescript
interface FinityClient {
  request: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
  storage: {
    get: <T = unknown>(key: string) => Promise<T | null>;
    set: <T = unknown>(key: string, value: T) => Promise<void>;
  };
}
```

## Creating a Widget
A widget is a React component that receives `WidgetProps`.

```tsx
import React from 'react';
import { WidgetProps } from '../sdk/types';

export const MyWidget: React.FC<WidgetProps> = ({ context, client }) => {
  return <div>My Widget in {context.theme} mode</div>;
};
```

## Testing
You can test widgets using the `mockClient` provided in `frontend/src/sdk/mockClient.ts` or via the Developer Sandbox page in the application.
