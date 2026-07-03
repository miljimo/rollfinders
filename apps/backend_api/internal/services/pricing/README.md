# Pricing Policy Service

Pricing Policy Service owns RollFinders commercial pricing policy, starting with platform fee policies.

The MVP supports:

* Reading the active platform fee policy by `provider_id` and currency.
* Updating platform fee percentage and fixed amount as a new active version.
* Previewing platform fee calculation using integer minor units.

Provider details are not duplicated in this service. `provider_id` is treated as an opaque identifier owned by wallet linked-account or provider records.
