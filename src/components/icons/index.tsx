// The icon seam: the only file that imports lucide-react (approved in 16-01).
// Every icon defaults to 20 px, stroke 1.75 and aria-hidden (UI-SPEC Design
// System); the control around it carries the accessible name.

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUser,
  Ellipsis,
  GripVertical,
  Map as MapGlyph,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Search,
  Ticket,
  Trash2,
  WifiOff,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

export type IconProps = Omit<LucideProps, 'ref'>

function seam(Icon: LucideIcon, name: string) {
  function SeamIcon({ size = 20, strokeWidth = 1.75, ...rest }: IconProps) {
    return <Icon aria-hidden focusable={false} size={size} strokeWidth={strokeWidth} {...rest} />
  }
  SeamIcon.displayName = name
  return SeamIcon
}

export const TicketIcon = seam(Ticket, 'TicketIcon')
export const MapIcon = seam(MapGlyph, 'MapIcon')
export const CircleUserIcon = seam(CircleUser, 'CircleUserIcon')
export const ArrowLeftIcon = seam(ArrowLeft, 'ArrowLeftIcon')
export const Maximize2Icon = seam(Maximize2, 'Maximize2Icon')
export const Minimize2Icon = seam(Minimize2, 'Minimize2Icon')
export const PlusIcon = seam(Plus, 'PlusIcon')
export const MinusIcon = seam(Minus, 'MinusIcon')
export const GripVerticalIcon = seam(GripVertical, 'GripVerticalIcon')
/** Lucide renamed more-horizontal to ellipsis; same glyph. */
export const MoreHorizontalIcon = seam(Ellipsis, 'MoreHorizontalIcon')
export const SearchIcon = seam(Search, 'SearchIcon')
export const WifiOffIcon = seam(WifiOff, 'WifiOffIcon')
export const CheckIcon = seam(Check, 'CheckIcon')
export const XIcon = seam(X, 'XIcon')
export const ChevronRightIcon = seam(ChevronRight, 'ChevronRightIcon')
export const ChevronDownIcon = seam(ChevronDown, 'ChevronDownIcon')
export const Trash2Icon = seam(Trash2, 'Trash2Icon')
