import { axiosRequest } from "@/lib/axiosRequest";

export interface UserEvent {
    event_id: number;
    user_id: number;
    event_type: string;
    value: number;
    created_at: string 
}

export interface UserEventPayload {
    user_id: number;
    event_type: string;
}