import type { CompanyId } from "./company"; import type { Address, DateRange, EntityId } from "./shared"; import type { UserId } from "./user";
export type SiteId = EntityId<"Site">;
export enum SiteStatus { Planned = "planned", Open = "open", OnHold = "on_hold", Closed = "closed", Cancelled = "cancelled" }
export interface GeoCoordinates { latitude: number; longitude: number }
export interface Site { id: SiteId; name: string; clientCompanyId: CompanyId; operatingCompanyId: CompanyId; address: Address; coordinates?: GeoCoordinates; reference?: string; purchaseOrderNumber?: string; costCenter?: string; managerId: UserId; schedule: DateRange; status: SiteStatus }
