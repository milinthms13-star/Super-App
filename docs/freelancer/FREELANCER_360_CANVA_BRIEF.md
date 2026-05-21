# Freelancer 360 Canva Brief

## Objective
Create a complete visual system and journey toolkit for the Freelancer module across Customer, Provider, and Admin roles with mobile-first behavior.

## Deliverables in Canva
1. Journey map board
2. Wireframe set (mobile and desktop)
3. High-fidelity UI screens
4. Component variant library
5. Accessibility and copy guide

## Core Journeys
1. Customer: Discover provider -> compare -> book -> OTP -> escrow -> completion -> review
2. Provider: Onboard -> bid -> lead purchase -> execution -> milestone updates
3. Admin: KYC -> disputes -> commission settings -> payment event monitoring

## Required Screens
1. Freelancer Home
2. Provider Discovery with filters
3. Provider Profile with masked contact
4. Booking Creation
5. Booking Timeline and status tracker
6. OTP verification flow
7. Escrow and milestone manager
8. Dispute submission and admin resolution
9. Plan purchase and activation
10. Admin dashboard with operational metrics

## State Variants (must be explicit for each screen)
1. Loading
2. Empty
3. Error
4. Success
5. Disabled/permission denied

## Design Tokens
- Typography
  - Heading: 32/40, 24/32, 20/28
  - Body: 16/24
  - Caption: 12/18
- Color
  - Primary: #0B6E4F
  - Accent: #F4A259
  - Danger: #C62828
  - Neutral text: #1F2937
  - Neutral bg: #F7F8FA
- Radius: 10
- Spacing scale: 4, 8, 12, 16, 24, 32

## Interaction Patterns
1. Sticky top actions for filter + role context
2. Inline status chips for booking/payment/dispute states
3. Confirm modal for destructive actions (cancel/refund/dispute resolve)
4. Retry affordance for network failures

## Content Guidance
1. Use plain-language microcopy for failures
2. Always show next best action on booking cards
3. Avoid exposing personal phone/email in UI copy

## Accessibility Checklist
1. Color contrast WCAG AA
2. Keyboard focus ring on all actionable controls
3. Minimum touch target 44x44
4. Form labels always visible
5. Status updates readable by screen readers

## Handoff Notes
1. Export component variants with naming:
   - Freelancer/Button/Primary
   - Freelancer/Card/Provider
   - Freelancer/StatusChip/Booking
2. Include mobile breakpoints at 360 and 412 widths
3. Include desktop breakpoint at 1280 width
