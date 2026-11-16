import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
import zoneinfo
import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger("kavach.cal_service")


class CalService:
    """
    Authoritative Cal.com API v2 client integrating Kavach scheduling directly
    with Mayur's personal Cal.com account (username: mayur-4bo7cv, event: 30min).
    """

    BASE_URL = "https://api.cal.com/v2"

    def __init__(self):
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "cal_api_key", "cal_live_a318f2142cfa1ac4d7053b9817947eb6")
        self.event_type_id = int(getattr(self.settings, "cal_event_type_id", 7917954))
        self.event_slug = getattr(self.settings, "cal_event_slug", "30min")
        self.username = getattr(self.settings, "cal_username", "mayur-4bo7cv")
        self.webhook_secret = getattr(self.settings, "cal_webhook_secret", "kavach_cal_sec_99182319284102")
        self.api_version = getattr(self.settings, "cal_api_version", "2024-08-13")

    def _headers(self, with_version: bool = True) -> Dict[str, str]:
        hdrs = {
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "Kavach-Platform/1.0 (https://kavachsecurity.me; contact@kavachsecurity.me)",
            "Content-Type": "application/json",
        }
        if with_version and self.api_version:
            hdrs["cal-api-version"] = self.api_version
        return hdrs

    def parse_slot_to_utc_iso(
        self,
        date_str: str,
        slot_str: str,
        timezone_str: str = "Asia/Kolkata",
    ) -> str:
        """
        Converts date and time slot (e.g. '2026-11-17' and '11:00 AM' or '3:30pm')
        into an absolute UTC ISO 8601 string expected by Cal.com API v2.
        """
        slot_clean = slot_str.strip()
        # If already full ISO timestamp
        if "T" in slot_clean and ("Z" in slot_clean or "+" in slot_clean):
            return slot_clean

        # Normalize time string
        slot_lower = slot_clean.lower()
        time_obj = None
        for fmt in ["%I:%M%p", "%I:%M %p", "%H:%M", "%I%p", "%I %p"]:
            try:
                time_obj = datetime.strptime(slot_lower, fmt).time()
                break
            except ValueError:
                continue

        if not time_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time slot format: '{slot_str}'. Supported formats include '11:00 AM', '3:30pm', or '15:30'.",
            )

        # Parse date string
        d_obj = None
        for dfmt in ["%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"]:
            try:
                d_obj = datetime.strptime(date_str.strip(), dfmt).date()
                break
            except ValueError:
                continue

        if not d_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: '{date_str}'. Expected format YYYY-MM-DD.",
            )

        try:
            tz = zoneinfo.ZoneInfo(timezone_str.strip())
        except Exception:
            tz = zoneinfo.ZoneInfo("Asia/Kolkata")

        local_dt = datetime.combine(d_obj, time_obj, tzinfo=tz)
        utc_dt = local_dt.astimezone(timezone.utc)
        return utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    async def get_available_slots(
        self,
        date_str: str,
        timezone_str: str = "Asia/Kolkata",
    ) -> Dict[str, Any]:
        """
        Queries real available booking slots from Cal.com API v2 for Mayur's 30-minute event.
        Converts the returned UTC slots into the attendee's selected timezone.
        """
        try:
            target_tz = zoneinfo.ZoneInfo(timezone_str)
        except Exception:
            target_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

        # Parse target date
        d_obj = None
        for dfmt in ["%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"]:
            try:
                d_obj = datetime.strptime(date_str.strip(), dfmt).date()
                break
            except ValueError:
                continue

        if not d_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: '{date_str}'. Expected format YYYY-MM-DD.",
            )

        clean_date_str = d_obj.strftime("%Y-%m-%d")

        # Start and end of the day in attendee's timezone converted to UTC
        start_local = datetime.combine(d_obj, datetime.min.time(), tzinfo=target_tz)
        end_local = datetime.combine(d_obj, datetime.max.time(), tzinfo=target_tz)

        start_utc_iso = start_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        end_utc_iso = end_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        url = f"{self.BASE_URL}/slots/available?eventTypeId={self.event_type_id}&startTime={start_utc_iso}&endTime={end_utc_iso}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=self._headers(with_version=False))
                if res.status_code != 200:
                    logger.warning(f"Cal.com slots response {res.status_code}: {res.text}")
                    # Return empty slots if Cal.com returns error or day has passed
                    return {
                        "date": clean_date_str,
                        "timezone": timezone_str,
                        "slots": [],
                        "available_count": 0,
                    }

                data = res.json()
                raw_slots_map = data.get("data", {}).get("slots", {})

                time_slots: List[Dict[str, Any]] = []
                for _, slots_list in raw_slots_map.items():
                    for s in slots_list:
                        raw_time = s.get("time")
                        if not raw_time:
                            continue
                        utc_dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
                        local_dt = utc_dt.astimezone(target_tz)
                        if local_dt.strftime("%Y-%m-%d") == clean_date_str:
                            t_12h = local_dt.strftime("%I:%M %p").lstrip("0")
                            t_24h = local_dt.strftime("%H:%M")
                            time_slots.append({
                                "time": t_12h,
                                "time_12h": t_12h,
                                "time_24h": t_24h,
                                "iso": raw_time,
                                "available": True,
                                "booked": False,
                            })

                # Sort chronologically
                time_slots.sort(key=lambda x: x["iso"])

                return {
                    "date": clean_date_str,
                    "timezone": timezone_str,
                    "event_type_id": self.event_type_id,
                    "slots": time_slots,
                    "available_count": len(time_slots),
                }

        except httpx.HTTPError as exc:
            logger.error(f"Network error querying Cal.com slots: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to connect to Cal.com availability service: {str(exc)}",
            )

    async def resolve_booking_datetime(
        self,
        date_str: str,
        slot_str: str,
        timezone_str: str = "Asia/Kolkata",
    ) -> tuple[str, str, str]:
        """
        Validates the requested date and slot against Cal.com's actual availability.
        If a past date or weekend is requested (e.g. from static mock UI states),
        it intelligently advances to the earliest upcoming weekday with available slots.
        Matches the slot name (e.g. '3:30pm') against the available slots on that date.
        Returns: (start_utc_iso, resolved_date_str, resolved_slot_str)
        """
        try:
            tz = zoneinfo.ZoneInfo(timezone_str.strip())
        except Exception:
            tz = zoneinfo.ZoneInfo("Asia/Kolkata")

        today = datetime.now(tz).date()

        # Parse requested date
        d_obj = None
        for dfmt in ["%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"]:
            try:
                d_obj = datetime.strptime(date_str.strip(), dfmt).date()
                break
            except ValueError:
                continue

        if not d_obj:
            d_obj = today

        # If date is in the past, or weekend (Saturday=5, Sunday=6), roll forward to upcoming weekday
        if d_obj < today:
            d_obj = today

        if d_obj.weekday() >= 5:
            d_obj += timedelta(days=(7 - d_obj.weekday()))

        # Check slots for this date, or if 0 slots available, advance up to 5 business days
        final_date = d_obj
        slots_data = None
        for _ in range(5):
            cur_date_str = final_date.strftime("%Y-%m-%d")
            slots_data = await self.get_available_slots(cur_date_str, timezone_str)
            if slots_data.get("available_count", 0) > 0:
                break
            # Advance to next day, skipping weekends
            final_date += timedelta(days=1)
            while final_date.weekday() >= 5:
                final_date += timedelta(days=1)

        available_slots = slots_data.get("slots", []) if slots_data else []

        # If we have available slots from Cal.com, match requested slot
        if available_slots:
            slot_clean = slot_str.strip().lower().replace(" ", "")
            # Try exact / normalized match
            matched_slot = None
            for s in available_slots:
                s_clean = s["time"].strip().lower().replace(" ", "")
                s_24_clean = s.get("time_24h", "").strip().lower()
                if slot_clean in (s_clean, s_24_clean):
                    matched_slot = s
                    break

            if not matched_slot:
                # Try partial match (e.g. '3:30' in '3:30pm')
                for s in available_slots:
                    if slot_clean.rstrip("apm") in s["time"].lower():
                        matched_slot = s
                        break

            # If still not matched, pick first available slot (or closest)
            if not matched_slot:
                matched_slot = available_slots[0]

            return (
                matched_slot["iso"],
                final_date.strftime("%Y-%m-%d"),
                matched_slot["time"],
            )

        # Fallback to direct conversion if slots endpoint returned empty
        iso_str = self.parse_slot_to_utc_iso(final_date.strftime("%Y-%m-%d"), slot_str, timezone_str)
        return (iso_str, final_date.strftime("%Y-%m-%d"), slot_str)

    async def create_booking(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates an authoritative booking in Mayur's personal Cal.com account using API v2.
        Configures Google Meet video conference, attendee profile, and metadata.
        """
        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip()
        company = str(payload.get("company") or "").strip()
        preferred_date = str(payload.get("preferred_date") or "").strip()
        preferred_time_slot = str(payload.get("preferred_time_slot") or "").strip()
        tz_name = str(payload.get("timezone") or "Asia/Kolkata").strip()
        primary_focus = str(payload.get("primary_focus") or "Live Platform Walkthrough").strip()
        job_title = str(payload.get("job_title") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not name or not email or not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name, business email, and company are required fields.",
            )
        if not preferred_date or not preferred_time_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Preferred date and time slot are required.",
            )

        # Intelligently resolve valid upcoming date and matching slot on Mayur's Cal.com calendar
        start_utc_iso, confirmed_date, confirmed_slot = await self.resolve_booking_datetime(
            preferred_date, preferred_time_slot, tz_name
        )

        cal_payload = {
            "start": start_utc_iso,
            "eventTypeId": self.event_type_id,
            "attendee": {
                "name": name,
                "email": email,
                "timeZone": tz_name,
                "language": "en",
            },
            "location": "integrations:google:meet",
            "metadata": {
                "company": company,
                "primary_focus": primary_focus,
                "job_title": job_title,
                "notes": notes,
                "source": "kavach-web",
            },
        }

        url = f"{self.BASE_URL}/bookings"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    url,
                    json=cal_payload,
                    headers=self._headers(with_version=True),
                )

                if res.status_code in (200, 201):
                    body = res.json()
                    b_data = body.get("data", {})
                    meeting_url = b_data.get("meetingUrl") or b_data.get("location") or ""
                    # Fallback if meetingUrl was null in raw response, check bookingFieldsResponses or locations
                    if not meeting_url and isinstance(b_data.get("bookingFieldsResponses"), dict):
                        loc_val = b_data["bookingFieldsResponses"].get("location", {})
                        if isinstance(loc_val, dict):
                            meeting_url = loc_val.get("value") or loc_val.get("optionValue") or ""

                    uid = b_data.get("uid", "")
                    cal_id = b_data.get("id")
                    confirmed_start = b_data.get("start", start_utc_iso)
                    confirmed_end = b_data.get("end", "")

                    logger.info(f"Cal.com booking created successfully: UID={uid}, Meet={meeting_url}")

                    return {
                        "status": "success",
                        "cal_booking_id": cal_id,
                        "cal_booking_uid": uid,
                        "meeting_url": meeting_url,
                        "confirmed_date": confirmed_date,
                        "confirmed_slot": confirmed_slot,
                        "confirmed_start": confirmed_start,
                        "confirmed_end": confirmed_end,
                        "duration": b_data.get("duration", 30),
                        "title": b_data.get("title", f"30 min meeting with {name}"),
                        "raw_response": b_data,
                    }

                # Handle failure / slot conflict from Cal.com
                err_text = res.text
                logger.error(f"Cal.com booking creation rejected {res.status_code}: {err_text}")
                try:
                    err_json = res.json()
                    msg = err_json.get("error", {}).get("message") or err_json.get("message") or err_text
                except Exception:
                    msg = err_text

                if res.status_code in (400, 409):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"The selected time slot ({preferred_time_slot} on {preferred_date}) is no longer available on Cal.com. Please select another slot.",
                    )
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Cal.com booking failed: {msg}",
                )

        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Unexpected error communicating with Cal.com: {exc}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to communicate with Cal.com scheduling API: {str(exc)}",
            )

    async def cancel_booking(self, booking_uid: str, reason: str = "Cancelled by user") -> Dict[str, Any]:
        """
        Cancels an existing booking in Cal.com by UID.
        """
        url = f"{self.BASE_URL}/bookings/{booking_uid}/cancel"
        payload = {"cancellationReason": reason}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=self._headers(with_version=True))
                if res.status_code in (200, 201):
                    return res.json().get("data", {})
                logger.warning(f"Cal.com cancel failed {res.status_code}: {res.text}")
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Cal.com cancellation failed: {res.text}",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error cancelling booking on Cal.com: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to cancel booking on Cal.com: {str(exc)}",
            )

    async def reschedule_booking(self, booking_uid: str, new_start_iso: str) -> Dict[str, Any]:
        """
        Reschedules an existing booking in Cal.com by UID to a new start timestamp.
        """
        url = f"{self.BASE_URL}/bookings/{booking_uid}/reschedule"
        payload = {"start": new_start_iso}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=self._headers(with_version=True))
                if res.status_code in (200, 201):
                    return res.json().get("data", {})
                logger.warning(f"Cal.com reschedule failed {res.status_code}: {res.text}")
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Cal.com reschedule failed: {res.text}",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error rescheduling booking on Cal.com: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to reschedule booking on Cal.com: {str(exc)}",
            )

    def verify_webhook_signature(self, raw_body: bytes, signature_header: Optional[str]) -> bool:
        """
        Validates the incoming X-Cal-Signature-256 header using HMAC-SHA256
        against the configured webhook secret.
        """
        if not signature_header or not self.webhook_secret:
            return False
        computed = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed.lower(), signature_header.strip().lower())


# Global singleton instance
cal_service = CalService()

