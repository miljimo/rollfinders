# AWS EventBridge
AWS EventBridge is a serverless event bus that can be use to build event-driven architecture; 
An Event-Driven architecture is a style of building loosely-coupled software systems that work together by emitting and responding to events.

##### Table Of Content
- [ Overview ](#Overview)



## Overview
![Event Bridge Config](../../docs/architectures/EventBridge.png)

AWS EventBridge have the following Resources to function. EventBridge was formally called AWS CloudWatch Events and still uses the same API with CloudWatch Events.

### EventBridge Resources
- Event
- Event Bus & Event Pipe
- Event Rule
- Event Scheduler

**Event** is a record in time that is captured and send to the event bus. Event is a Json objects as shown.


```json
    {
    "version": "0",
    "id": "UUID",
    "detail-type": "event name",
    "source": "event source",
    "account": "ARN",
    "time": "timestamp",
    "region": "region",
    "resources": [
        "ARN"
    ],
    "detail": {
        JSON object
    }
    }
```
**Event Bus** is a collection events added into a container to be process and send to a targets.
EventBus can collect multi-event source from different source and route a single events to multi-targets.

**Event Pipe**  AWS EventBridge also uses pipe to deliver events from a single source to a single target.


**Event Rule** Event bus uses event rule to know where to route a matched event to. Event rules can have zero or more event targets.
You can disabled and enabled event rule.


