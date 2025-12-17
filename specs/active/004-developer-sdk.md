# Specification: Developer SDK Distribution

## 1. Overview
To enable third-party developers to build widgets for the JuaLuma Marketplace, we need to distribute a `JuaLuma-widget-sdk`. This SDK provides the necessary TypeScript type definitions (`.d.ts`) and protocol documentation for communicating with the JuaLuma main app.

## 2. Requirements

### 2.1 Backend
- **Endpoint**: `/api/developers/sdk`
- **Access**: Public (or Restricted to Developers - Public is easier for adoption).
- **Response**: Returns a downloadable `.zip` or `.tgz` file containing the SDK.
- **Content**:
    - `index.d.ts`: Type definitions for `WidgetContext`, `JuaLumaClient`, and `WidgetProps`.
    - `README.md`: Quick start guide.
    - `example-widget.tsx`: A minimal example.

### 2.2 Frontend
- **Location**: `DeveloperMarketplace.tsx` (Dashboard).
- **UI**: A clear "Download SDK" button in the developer dashboard header or sidebar.
- **Action**: Direct link to `/api/developers/sdk/latest`.

## 3. Data Models
No new database models required. The SDK is a static asset served by the backend.

## 4. Security
- Use standard `security_headers` middleware.
- Rate limiting applies as per standard configuration.
- No PII involved.

## 5. Implementation Details
- **SDK Generation**: For this phase, we will manually create the `sdk_assets` directory in `backend/static/` and zip it on startup or serve from a pre-zipped file.
- **Serving**: Use `FastAPI.responses.FileResponse`.
