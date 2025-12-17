# JuaLuma Widget SDK

Welcome to the JuaLuma Widget SDK! This package allows you to build custom widgets for the JuaLuma Dashboard.

## Getting Started

1.  **Install Dependencies**: Ensure you have React installed.
2.  **Use the Types**: Import `WidgetProps` from `index.d.ts` to type your React components.

```typescript
import { WidgetProps } from './JuaLuma-sdk';

export const MyWidget: React.FC<WidgetProps> = ({ context, client }) => {
  return (
    <div>
      <h1>Hello, {context.user.uid}</h1>
    </div>
  );
};
```

## Publishing

Upload your widget bundle via the Developer Portal.
