<!--
# Driver:
1. aigular pdf extract korar baki ase
2. verified korar baki ase
3. admin approval ar ta baki ase
4. background check baki ase
5. live selfie ar kaj ta baki ase
-->

<!--
# Car:
1. insuranceHub, personalAutoInsurance, vehicleLicense aigular pdf extract korar baki ase
2. verified korar baki ase
-->

<!-- ========================================================================= -->

<!--
# Thursday Work:
1. referrels ta poro ta check korte hobe
-->

<!-- ======================================================= -->

<!--
1. FRIDAY: aro kiso pbl ase ta chatgpt te pin kora ase shaigula o resolve korte hobe
2. rider ar khetre cancellation ar jonno rider k pay korte hobe na, borong amra porobortite tier create korbo, shaikhne rider ar jnno point add abong point kata jabe, tu rider cancel korle rider ar point kata jabe r  cancellation ar jonno pay korbe kebol user e, tu aita porobortite thik kore nite hobe
-->

<!--
1. Ai Support
2. Tier & Points
3. Broadcast
4. Pdf extract (veryfi aita use kore parse ar kaj ta complete korbo)
-->

<!--
1. id bananor jonno sob kiso ak jaiga theke use hobe
2. sobgular khetre e custom Id make korbe but mongodb query ar jnno sobsomai e _id use korbe
3. somosto jaigai soft delete use korte hobe, ak e sathe kono data jadi delete orthat soft delete e kora hoi ta o jeno agaer data te ba id te null show na kore, ager existing data jeno sothin vabe e populate hoi
4. jaigai jaigai curerncy alada kore rakhar/config korar dorakr nai, sob ak jaiga theke currency config hobe, r shaita e poro project a use hobe

 -->

<!--
 App:
 1.

  -->

 <!-- 
 App-Dashboard

   "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Australia/Melbourne",

    projonio jaigai timezone gula dropdown akare show korte hobe, jeno easly select korte pare
 
  -->

  <!-- 
  # Implementation Plan - Future-Proof OCR Architecture using Strategy Pattern (Veryfi First)

We want to implement a production-ready OCR (Optical Character Recognition) system for driver onboarding documents.

The first OCR provider will be **Veryfi**, but the architecture must be designed so that in the future we can switch to another OCR provider (Mindee, Google Document AI, AWS Textract, Azure Document Intelligence, OpenAI Vision, etc.) without changing any business logic.

This implementation must follow the **Strategy Pattern** and clean architecture principles.

---

# Important Requirements

> [!IMPORTANT]
>
> - Existing upload flow must remain unchanged.
> - Existing APIs must remain unchanged.
> - Existing Ride, Driver, Car, Stripe, Wallet, Review, Booking, Payment, Cancellation, Verification and all other business logic must remain unchanged.
> - The frontend must never communicate directly with Veryfi.
> - Only the backend communicates with OCR providers.
> - The OCR system must be completely provider-independent.
> - Swapping OCR providers in the future should require changing only the provider implementation, not business logic.

---

# Goal

Whenever a driver uploads a supported document:

1. Upload file
2. Save file on server
3. Save document metadata in MongoDB
4. Detect document type
5. Send document to OCR provider
6. Extract structured information
7. Normalize extracted data
8. Save extracted data
9. Update extraction status
10. Return updated document

---

# Supported Documents

Implement OCR support for:

## Driver

- Driving License

## Car

- Vehicle Registration / Vehicle License

- Personal Auto Insurance

- Insurance Hub Documents

## Tax

- All existing Tax Documents

The architecture must support future document types without modification.

Examples:

- Passport
- National ID
- SSN
- DOT Certificate
- Business License
- Medical Certificate
- Vehicle Inspection
- Registration Renewal
- Residency Proof

---

# Architecture

Follow Strategy Pattern.

Example architecture:

```
src/app/modules/ocr/

    interfaces/
        ocrProvider.interface.ts

    providers/

        veryfi.provider.ts

        (future)
        mindee.provider.ts
        google.provider.ts
        aws.provider.ts
        azure.provider.ts

    services/

        ocr.service.ts

    factories/

        ocrProvider.factory.ts

    types/

        document.types.ts

    constants/

        ocr.constant.ts

    utils/

        normalizeDocument.ts
        confidence.util.ts

    validation/

        ocr.validation.ts
```

Business modules must never know which OCR provider is being used.

---

# Component 1

## OCR Provider Interface

Create a reusable provider contract.

Example:

```ts
interface IOcrProvider {

    extractDocument(
        documentType,
        filePath
    ): Promise<ExtractedDocument>;
}
```

Every OCR provider must implement this interface.

No provider-specific code should exist outside provider implementations.

---

# Component 2

## Veryfi Provider

Create

```
VeryfiProvider
```

Responsibilities:

- Authenticate with Veryfi

- Upload file

- Parse response

- Convert response into common OCR format

No business logic.

No MongoDB logic.

No Driver logic.

No Car logic.

Only Veryfi communication.

---

# Component 3

## OCR Provider Factory

Create

```
OCRProviderFactory
```

The factory should return the correct provider.

Example

```
VERYFI

↓

new VeryfiProvider()
```

Future

```
MINDEE

↓

new MindeeProvider()
```

Future

```
GOOGLE

↓

new GoogleProvider()
```

The rest of the application should call only

```
OCRProviderFactory
```

Never instantiate providers directly.

---

# Component 4

## OCR Service

Create

```
OCRService
```

Responsibilities:

- Determine document type

- Ask factory for provider

- Execute extraction

- Normalize result

- Return unified OCR response

No provider-specific code here.

---

# Component 5

## Configuration

Add

```
OCR_PROVIDER=VERYFI
```

Environment variables

```
OCR_PROVIDER

VERYFI_CLIENT_ID

VERYFI_USERNAME

VERYFI_API_KEY

VERYFI_BASE_URL
```

Future providers should simply add their own credentials.

No code changes required.

---

# Component 6

## Upload Flow

Existing upload flow must remain.

Flow

Upload

↓

Save file

↓

Save MongoDB document

↓

OCRService.extract()

↓

OCR Provider

↓

Normalized Result

↓

Update MongoDB

↓

Return response

---

# Component 7

## Extraction Status

Support

```
PENDING

PROCESSING

COMPLETED

FAILED

MANUAL_REVIEW
```

Immediately after upload

↓

PENDING

OCR starts

↓

PROCESSING

OCR success

↓

COMPLETED

Low confidence

↓

MANUAL_REVIEW

OCR error

↓

FAILED

---

# Component 8

## Generic Extraction Result

All OCR providers must return exactly the same structure.

Example

```
provider

confidence

warnings

rawResponse

normalizedData

status

processedAt
```

No provider-specific response should leak outside the provider.

---

# Component 9

## Normalizers

Every supported document type should have its own normalizer.

Examples

Driver License

↓

DriverLicenseNormalizer

Vehicle Registration

↓

VehicleRegistrationNormalizer

Insurance

↓

InsuranceNormalizer

Tax

↓

TaxDocumentNormalizer

Normalizers convert OCR responses into strongly typed application objects.

---

# Component 10

## Typed Extraction

Do NOT use

```
Record<string, unknown>
```

Create dedicated interfaces.

Examples

Driver License

↓

DriverLicenseExtraction

Vehicle Registration

↓

VehicleRegistrationExtraction

Insurance

↓

InsuranceExtraction

Tax

↓

TaxDocumentExtraction

These types should integrate with the generic

```
IDocumentFile<T>
```

structure.

---

# Component 11

## Confidence Handling

If confidence >= configured threshold

↓

Automatically populate extractedData

If confidence < threshold

↓

Save extraction

↓

Status

MANUAL_REVIEW

↓

Allow manual verification later

Do not reject uploads.

---

# Component 12

## Retry Support

Create reusable retry API.

Retry should

- reuse uploaded document

- call OCR again

- overwrite extractedData

- update confidence

- update extraction status

No duplicate uploads.

---

# Component 13

## Error Handling

Handle

- Invalid credentials

- Timeout

- API unavailable

- Unsupported document

- Unsupported format

- Empty OCR response

- Invalid OCR response

- Rate limit

Always preserve uploaded files.

Never delete uploads.

---

# Component 14

## Logging

Log

Upload Started

OCR Started

OCR Completed

OCR Failed

Confidence

Provider

Duration

Retry Count

Follow existing logging strategy.

---

# Component 15

## API Responses

Existing upload APIs must remain unchanged.

Extend response only with

```json
{
    "ocr": {
        "provider": "veryfi",
        "status": "completed",
        "confidence": 0.98,
        "manualReviewRequired": false,
        "processedAt": "..."
    }
}
```

Do not expose raw Veryfi response.

---

# Component 16

## Future Provider Support

The following providers should be supported in future without touching business logic:

- Mindee

- Google Document AI

- AWS Textract

- Azure Document Intelligence

- OpenAI Vision

- OCR.space

Adding a provider should require only:

- New Provider class

- Register provider in OCRProviderFactory

Nothing else.

---

# Verification

Verify:

✅ Upload Driving License

✅ Upload Vehicle Registration

✅ Upload Insurance

✅ Upload Tax Document

✅ OCR Success

✅ OCR Failure

✅ Low Confidence

✅ Retry OCR

✅ Existing Upload APIs unchanged

✅ Existing Business Logic unchanged

✅ Existing Frontend unchanged

✅ Provider can be changed by updating only:

```
OCR_PROVIDER
```

without modifying any business logic.

Finally run:

```bash
npm run build
```

The project must compile successfully with zero TypeScript errors and preserve all existing functionality.
   -->
