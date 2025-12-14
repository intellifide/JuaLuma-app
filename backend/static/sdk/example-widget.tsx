import React from 'react';
import { WidgetProps, useFinity } from './index';

export const ExampleWidget: React.FC<WidgetProps> = ({ context }) => {
    const { client } = useFinity();
    const [data, setData] = React.useState<any>(null);

    React.useEffect(() => {
        // Example: Fetch user profile basics
        client.request('get_profile').then(setData);
    }, [client]);

    return (
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Hello, {context.user.name}!</h3>
            <p>Theme: {context.theme}</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};
