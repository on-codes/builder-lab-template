## Purpose

Lets a product built on this template charge a monthly subscription (two demo tiers) through
Stripe Checkout, gives users self-service plan management via the Stripe Customer Portal, and
keeps this app's own database in sync with Stripe as the source of truth for entitlement
checks — without any of it being built again downstream.

## ADDED Requirements

### Requirement: Subscription checkout

The system SHALL create a Stripe Checkout Session for an authenticated user against a
server-resolved Price ID, and SHALL NOT accept a price or amount supplied by the client.

#### Scenario: Starting checkout for a valid plan

- **WHEN** an authenticated user requests checkout for the `"pro"` or `"business"` plan
- **THEN** a Checkout Session is created for the matching server-side Price ID and the user is
  redirected to Stripe's hosted checkout page

#### Scenario: Requesting checkout for an unknown plan

- **WHEN** a checkout request names a plan identifier that isn't in the server-side plan
  config
- **THEN** the request is rejected before any Stripe API call is made

### Requirement: Customer Portal access

The system SHALL let a user with an existing Stripe customer record reach the Stripe Customer
Portal to change or cancel their plan, without exposing any Stripe-hosted card data to this
app's own backend.

#### Scenario: Opening the portal

- **WHEN** a user with a Stripe customer id requests the billing portal
- **THEN** a portal session is created for their own Stripe customer id and they are
  redirected to it

### Requirement: Webhook signature verification

The system SHALL reject any webhook payload whose signature does not verify against the
configured webhook secret, and SHALL NOT process its contents.

#### Scenario: Valid signature

- **WHEN** a webhook request arrives with a signature that verifies
- **THEN** its event is processed according to its type

#### Scenario: Invalid or missing signature

- **WHEN** a webhook request arrives with a signature that fails verification, or with no
  signature header at all
- **THEN** the request is rejected and no event data is acted on

### Requirement: Webhook idempotency

The system SHALL process each distinct Stripe event id at most once, even if Stripe delivers
the same event multiple times.

#### Scenario: First delivery of an event

- **WHEN** an event id has not been seen before
- **THEN** it is processed and recorded as processed

#### Scenario: Redelivery of the same event

- **WHEN** an event id that was already recorded as processed is delivered again
- **THEN** the request succeeds (so Stripe stops retrying) but no side effect runs a second
  time

### Requirement: Subscription state sync

The system SHALL keep a subscription's status, plan, and current period end in this app's own
database in sync with Stripe, driven only by webhook events — never by a client-supplied
value.

#### Scenario: Checkout completes

- **WHEN** a `checkout.session.completed` event arrives for a subscription checkout
- **THEN** the corresponding user's subscription record reflects the new Stripe customer and
  subscription ids, status, plan, and current period end

#### Scenario: Subscription updated

- **WHEN** a `customer.subscription.updated` event arrives (e.g. a plan change, a renewal, a
  past-due transition)
- **THEN** the matching subscription record's status/plan/period-end are updated to match

#### Scenario: Subscription canceled

- **WHEN** a `customer.subscription.deleted` event arrives
- **THEN** the matching subscription record's status reflects cancellation

### Requirement: Entitlement checks are server-derived

The system SHALL provide a server-only check for an active subscription that reads the
database directly, and SHALL NOT grant access to a subscription-gated feature based on any
value supplied by the client.

#### Scenario: Active subscriber

- **WHEN** a gated feature calls the active-subscription check for a user whose database
  record shows an active status
- **THEN** access is granted

#### Scenario: No active subscription

- **WHEN** a gated feature calls the active-subscription check for a user with no
  subscription record, or a canceled/past-due one
- **THEN** access is denied, regardless of any client-supplied claim to the contrary

### Requirement: Payment outcome notifications

The system SHALL send a subscription receipt email on successful payment and a payment-failed
email on failed payment, using this app's own email templates.

#### Scenario: Payment succeeds

- **WHEN** an `invoice.payment_succeeded` event arrives
- **THEN** the associated user is sent a subscription-receipt email

#### Scenario: Payment fails

- **WHEN** an `invoice.payment_failed` event arrives
- **THEN** the associated user is sent a payment-failed email
