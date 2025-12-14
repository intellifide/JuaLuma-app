# Finity Widget SDK

Welcome to the Finity Widget SDK! This package allows you to build custom widgets for the Finity Dashboard.

## Getting Started

1.  **Install Dependencies**: Ensure you have React installed.
2.  **Use the Types**: Import `WidgetProps` from `index.d.ts` to type your React components.

```typescript
import { WidgetProps } from './finity-sdk';

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
