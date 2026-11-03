"""Offline prompt/graph checks; fixture responses do not verify model accuracy."""
import json
import uuid

import pytest
from langchain_core.messages import AIMessage

import backend as b


@pytest.mark.parametrize("approved", [True, False], ids=["approve", "revise"])
@pytest.mark.parametrize(
    "query,constraints",
    [
        (
            "Plan a 3-day Goa trip, December 10–12, 2026, maximum ₹30,000.",
            {"destination": "Goa", "duration": "3 days, December 10–12, 2026",
             "budget": "₹30,000"},
        ),
        (
            "Plan a 7-day Japan trip from Delhi visiting Tokyo, Hakone, Kyoto "
            "and Osaka, maximum ₹2,00,000. No dates supplied.",
            {"origin": "Delhi", "destination": "Tokyo, Hakone, Kyoto and Osaka",
             "duration": "7 days", "budget": "₹2,00,000"},
        ),
    ],
    ids=["goa", "japan"],
)
def test_constraints_reach_prompts_and_both_decisions_finalize(
    monkeypatch, query, constraints, approved,
):
    calls = {}

    def offline_call(messages, label, max_tokens):
        assert label not in calls, "Unexpected repeated generation"
        calls[label] = messages
        if label == "guardrail":
            return AIMessage(content='{"allowed": true}')
        if label == "supervisor":
            return AIMessage(content=json.dumps({
                "selected_agents": ["budget_agent", "itinerary_agent"],
                "trip_constraints": constraints,
            }))
        if label == "budget_agent":
            return AIMessage(content="Offline budget fixture.")
        if label in {"itinerary_agent", "final_agent"}:
            return AIMessage(
                content="Offline document fixture.\nA complete final sentence.",
                response_metadata={"finish_reason": "length"},
            )
        assert label in {"itinerary_agent:continuation", "final_agent:continuation"}
        return AIMessage(content="Offline continuation fixture.")

    monkeypatch.setattr(b, "_call_once", offline_call)
    thread_id = f"offline-consistency-{uuid.uuid4().hex}"
    draft = b.run_travel_agent(query, thread_id)
    assert draft["requires_approval"] is True
    assert "final_agent" not in calls
    assert "finalize" in draft["approval_request"]

    feedback = "Reduce hotel costs without changing the trip duration."
    result = b.resume_travel_agent(thread_id, approved, "" if approved else feedback)
    assert result["requires_approval"] is False
    assert result["approved"] is approved
    assert result["thread_id"] == thread_id
    assert result["human_feedback"] == ("" if approved else feedback)
    assert result["answer"] == "Offline document fixture.\nA complete final sentence.\nOffline continuation fixture."
    assert not b.travel_graph.get_state(
        {"configurable": {"thread_id": thread_id}},
    ).next

    supervisor_prompt = calls["supervisor"][1].content
    assert query in supervisor_prompt
    assert "explicit duration and budget ceiling" in supervisor_prompt
    for label in ("budget_agent", "itinerary_agent", "final_agent"):
        prompt = calls[label][1].content
        assert query in prompt
        assert constraints["budget"] in prompt
        assert constraints["duration"] in prompt
        assert b.TRIP_CONSISTENCY_RULES in prompt
    if not approved:
        assert feedback in calls["final_agent"][1].content
    for label in ("itinerary_agent", "final_agent"):
        system, continuation = calls[f"{label}:continuation"]
        assert query in system.content
        assert constraints["budget"] in system.content
        assert constraints["duration"] in system.content
        assert b.TRIP_CONSISTENCY_RULES in continuation.content
        if label == "final_agent" and not approved:
            assert feedback in system.content
