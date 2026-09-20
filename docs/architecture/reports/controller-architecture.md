# Controller Architecture Analysis & Unification Plan

## 1. Executive Summary
This document defines the official Controller pattern for the MANARATAK Presentation Layer. Following an architectural analysis of the current setup (`BaseController` vs. `ExpressAdapter`), we have determined that `BaseController` violates Clean Architecture principles, while the Adapter Pattern represents the correct structural approach. To ensure long-term framework independence, this plan introduces an overarching HTTP Adapter abstraction.

## 2. Architecture Analysis

Currently, two competing patterns exist in `apps/api/src/presentation/`:

### 2.1 BaseController
*   **Responsibility:** An abstract class providing convenience HTTP response methods (e.g., `ok()`, `unauthorized()`) and wrapping the execution logic in a `try/catch`.
*   **Architectural Alignment:** **Redundant & Anti-pattern.** It binds `express.Request` and `express.Response` directly to the controller implementation (`executeImpl(req, res)`). This strongly couples the presentation layer's business logic to the Express.js framework, violating the Dependency Inversion Principle (DIP) and making unit testing cumbersome.

### 2.2 ExpressAdapter (and `IController`)
*   **Responsibility:** An adapter that bridges the Express HTTP router to framework-agnostic controllers implementing `IController<IRequest, IResponse>`.
*   **Architectural Alignment:** **Complementary to Clean Architecture, but lacks abstraction.** While using an adapter is the correct pattern, tying the architectural standard directly to `ExpressAdapter` couples the presentation strategy to Express conceptually. Furthermore, the current implementation passes the raw Express `Request` object directly to the controller, which leaks the framework into the controller.

## 3. Recommended Architecture

The official Presentation Layer architecture for MANARATAK will standardize on a **Framework-Agnostic Adapter Pattern** utilizing `IController` and a new `IHttpAdapter` abstraction.

*   **Deprecated Component:** `BaseController` is officially deprecated. No new controllers shall inherit from it. It will be phased out.
*   **Architectural Abstraction:** A new `IHttpAdapter` interface will be defined to represent the contract for binding HTTP frameworks to MANARATAK controllers.
*   **Standard Component:** `ExpressAdapter` will serve as just one specific implementation of `IHttpAdapter`.
*   **Refinement Requirement:** `ExpressAdapter` (and any future adapters) must map the framework-specific request object (e.g., extracting `body`, `query`, `params`, `headers`) to a generic, framework-agnostic DTO before passing it to the controller.

### 3.1 Future Adapter Extensibility
By defining `IHttpAdapter`, the system is protected against framework lock-in. Future implementations (such as `FastifyAdapter`, `HonoAdapter`, or `NestHttpBridgeAdapter`) can simply implement the `IHttpAdapter` contract. These adapters would extract their framework-specific request payloads, map them to the expected standard DTO, execute the unmodified `IController`, and translate the generic response back to their respective framework formats.

## 4. Final Controller Development Standard

Every future Controller must be implemented according to the following lifecycle and standards:

### 4.1 Controller Lifecycle & Isolation
*   **Framework Agnosticism:** Controllers **MUST NOT** import `express` or interact with Express `Request`/`Response` objects (or any other HTTP framework primitives).
*   **Interface:** All controllers **MUST** implement the `@manaratak/core` interface `IController<TRequest, TResponse>`.
*   **Dependency Injection:** Controllers are the entry points for Use Cases. All Use Cases and services required by the controller must be injected via the constructor.

### 4.2 Request and Response Flow
1.  **Route Definition:** The framework's router defines the endpoint.
2.  **Adapter Execution:** The route handler is configured using the adapter implementation (e.g., `ExpressAdapter.adapt(new MyController(...))`).
3.  **Request Mapping (Adapter):** The adapter extracts `body`, `query`, `params`, and `headers` from the framework request and constructs a generic DTO payload.
4.  **Controller Execution:** The controller executes the Use Case using the generic payload.
5.  **Response Generation:** The controller returns a generic response object (e.g., `{ statusCode: 200, body: {...} }`).
6.  **Response Mapping (Adapter):** The adapter maps the generic response back to the framework's native response format.

### 4.3 Validation Entry Point
Validation of incoming payloads (DTOs) should occur **inside the Controller** or via **Middleware** before the adapter is invoked. The controller relies on the `IValidationPipeline` or Application Layer Use Cases to validate domain constraints.

### 4.4 Error Handling
Controllers should not use `try/catch` for standard domain exceptions unless they need to map specific domain errors to specific generic HTTP status codes. Unhandled exceptions are caught by the `IHttpAdapter` implementation (e.g., `ExpressAdapter`) and mapped to a generic `500 Internal Server Error`, or intercepted by global error-handling middleware.

## 5. Migration Strategy
1.  **No Refactoring Required Yet:** As there are currently no controllers extending `BaseController`, no active code refactoring is necessary.
2.  **Future Actions:** 
    *   Introduce the `IHttpAdapter` interface in `@manaratak/core`.
    *   Update `ExpressAdapter.ts` to implement `IHttpAdapter` and map the Express Request to a framework-agnostic DTO.
3.  **Deprecation:** Keep `BaseController` for reference temporarily if needed, but mark it with `@deprecated` in code comments.
