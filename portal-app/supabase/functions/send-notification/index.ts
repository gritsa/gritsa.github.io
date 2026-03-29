import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import nodemailer from 'npm:nodemailer@6.9.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Gritsa logo (inline SVG as base64 data-URI) ───────────────────────────────
const LOGO_DATA_URI =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0ndXRmLTgnPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgODAwIDQwMCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImVtYmxlbS1ncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMzODZCQjciIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0UyNEM0QSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InRleHQtZ3JhZGllbnQtYm9sZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzg2QkI3IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNFMjRDNEEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ0ZXh0LWdyYWRpZW50LXN1YnRsZSIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMUUzQTUyIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMzODZCQjciIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZHJvcC1zaGFkb3ciPgogICAgICA8ZmVHYXVzc2lhbkJsdXIgaW49IlNvdXJjZUFscGhhIiBzdGREZXZpYXRpb249IjIiIC8+CiAgICAgIDxmZU9mZnNldCBkeD0iMCIgZHk9IjEiIC8+CiAgICAgIDxmZUNvbXBvbmVudFRyYW5zZmVyPgogICAgICAgIDxmZUZ1bmNBIHR5cGU9ImxpbmVhciIgc2xvcGU9IjAuMiIgLz4KICAgICAgPC9mZUNvbXBvbmVudFRyYW5zZmVyPgogICAgICA8ZmVNZXJnZT4KICAgICAgICA8ZmVNZXJnZU5vZGUgLz4KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49IlNvdXJjZUdyYXBoaWMiIC8+CiAgICAgIDwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwgMzUpIHNjYWxlKDAuMzIpIiBmaWx0ZXI9InVybCgjZHJvcC1zaGFkb3cpIj4KICAgIDxwYXRoIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBmaWxsPSJ1cmwoI2VtYmxlbS1ncmFkaWVudCkiIGQ9Ik01ODIuMjM3LDE5NS4zMDlDMzQ1LjUyMiwzNzcuODEsNjg0Ljk3OSw1NzEuOTQ2LDY4NC45NzksNTcxLjk0NnMzNzYuNiwxNTguOSwwLDMxMi4wMTYsMzcuMzI4LTQ1NC43NSwzNy4zMjgtNDU0Ljc1LDMwNi4yNzYtNTI0LjUyOCw0MS44NjQtMjU3LjY1NFM1ODIuMjM3LDE5NS4zMDksNTgyLjIzNywxOTUuMzA5WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE3MywgMTApIiAvPgogIDwvZz4KICA8ZyBpZD0iZ3JpdHNhLXRleHQiPgogICAgPHBhdGggZD0iTTM1MiAtMjA0QzM2MCAtMjA0IDM2NSAtMTk5IDM2NSAtMTg5QzM4MSAtMTMyIDQ5MyA4NSA1NzQgMjA3QzU3NyAyMTIgNTc5IDIxOCA1NzkgMjI1QzU3OSAyNTMgNTUzIDI5MCA1MzQgMjkwQzUzMCAyOTAgNTI2IDI4OCA1MjMgMjg0TDUyMCAyNzdDNDg3IDIyNCAzODkgNjcgMjcxIDY3QzIxOSA2NyAxODIgOTYgMTgyIDE3MUMxODIgMjEyIDE5NCAyNTYgMjE0IDI5OEMyNDEgMjkyIDI3MCAyODggMzAyIDI4OEM0NzIgMjg4IDY5NiAzOTAgNjk2IDUyMEM2OTYgNTkzIDYyNyA2NTMgNTQ0IDY1M0M0MjIgNjUzIDI0MCA1MjMgMTU3IDM2NkMxMzcgMzg1IDEyNSA0MTMgMTI1IDQ1M0MxMjUgNTIwIDE1OSA1ODQgMjI2IDYxNUMyMjkgNjE5IDIzMCA2MjIgMjMwIDYyNUMyMzAgNjM0IDIxNyA2NDAgMTk5IDY0MEMxNDcgNjQwIDUwIDU5NyA1MCA0NzRDNTAgNDEyIDg0IDM2MSAxMzkgMzI4QzEyMiAyODggMTEzIDI0NyAxMTMgMjA2QzExMyA3MiAyMTEgMjIgMjg3IDIyQzMzMCAyMiAzNjggMzggNDAzIDYwQzM0OSAtMjkgMzAwIC0xMTEgMjk4IC0xMzdDMjk2IC0xNzMgMzMyIC0yMDQgMzUyIC0yMDRaTTI3NCAzMzFDMjYwIDMzMSAyNDYgMzMyIDIzMiAzMzRDMzEzIDQ3MyA0NzUgNTk0IDU4NiA1OTRDNjIyIDU5NCA2NDAgNTgxIDY0MCA1NTNDNjQwIDQ2NSA0NjMgMzMxIDI3NCAzMzFaIiBmaWxsPSJ1cmwoI3RleHQtZ3JhZGllbnQtc3VidGxlKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjY1LCAyMDApIHNjYWxlKDAuMTY1LCAtMC4xNjUpIiAvPgogICAgPHBhdGggZD0iTTIyNiAwQzI4NCAwIDM1MyA0MyA0MTkgMTM3QzQyMyAxNDUgNDI0IDE1NSA0MjQgMTYzQzQyNCAxODYgNDE0IDIwNiA0MDMgMjA2QzQwMCAyMDYgMzk2IDIwNCAzOTMgMjAxQzMzOCAxMjAgMjU0IDQwIDIxMyA0MEMxOTggNDAgMTk0IDQ5IDE5NCA2MUMxOTQgMTE2IDMwNiAyNTAgMzM1IDI4MEMzNDEgMjg2IDM0MyAyOTMgMzQzIDMwMkMzNDMgMzI4IDMyNCAzNjUgMzA3IDM2NUMzMDMgMzY1IDMwMCAzNjQgMjk3IDM2MEMyNzcgMzQ1IDI0MiAzMjMgMTk2IDMyM0gxODZDMjA5IDM2NSAyMjIgNDAyIDIyMiA0MThDMjIyIDQ0MiAyMTEgNDUyIDE5NiA0NTJDMTY0IDQ1MiAxMTQgNDA2IDExNCAzNTZDMTE0IDM0NSAxMTcgMzM1IDEyMiAzMjZDMTA1IDI5MCA3NyAyNDQgNDggMjAxQzQ1IDE5NiA0MyAxOTAgNDMgMTgzQzQzIDE1OCA1OCAxMzYgNjkgMTM2QzcxIDEzNiA3MiAxMzYgNzQgMTM3QzEwNiAxODMgMTM4IDIzNiAxNjUgMjg1QzE4NCAyNzQgMjA3IDI2NyAyMzEgMjY2QzE2OSAyMDEgMTI1IDEzOSAxMjUgOTNDMTI1IDQ0IDE3NiAwIDIyNiAwWiIgZmlsbD0idXJsKCN0ZXh0LWdyYWRpZW50LXN1YnRsZSkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM2Mi44NDUsIDIwMCkgc2NhbGUoMC4xNjUsIC0wLjE2NSkiIC8+CiAgICA8cGF0aCBkPSJNMjIxIDM5NEMyNTAgMzk0IDI4MCA0MjQgMjgwIDQ1OEMyODAgNDgzIDI2NCA1MDEgMjQwIDUwMUMyMDkgNTAxIDE4MiA0NjggMTgyIDQzNkMxODIgNDEzIDE5NCAzOTQgMjIxIDM5NFpNMTA4IDBDMTU1IDAgMjIzIDUyIDI3OSAxMzdDMjgzIDE0NSAyODQgMTU1IDI4NCAxNjRDMjg0IDE4NiAyNzQgMjA3IDI2MyAyMDdDMjYwIDIwNyAyNTYgMjA1IDI1MyAyMDFDMjE0IDE0MiAxMzIgNDggOTAgNDhDODAgNDggNzUgNTQgNzUgNjRDNzUgMTEyIDE1NiAyMzAgMTg3IDI4MEMxOTEgMjg2IDE5MiAyOTMgMTkyIDMwMUMxOTIgMzI4IDE3MSAzNjEgMTU1IDM2MUMxNTIgMzYxIDE0OSAzNTkgMTQ2IDM1NkMxMjQgMzMwIDE0IDE3MSAxNCAxMDVDMTQgNjUgNTMgMCAxMDggMFoiIGZpbGw9InVybCgjdGV4dC1ncmFkaWVudC1zdWJ0bGUpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0MTkuNzcwMDAwMDAwMDAwMDQsIDIwMCkgc2NhbGUoMC4xNjUsIC0wLjE2NSkiIC8+CiAgICA8cGF0aCBkPSJNMTI3IC0zQzIwMCAtMyAyNzMgNjIgMzI3IDEzN0MzMzAgMTQ1IDMzMiAxNTQgMzMyIDE2M0MzMzIgMTg2IDMyMiAyMDcgMzExIDIwN0MzMDggMjA3IDMwNCAyMDUgMzAxIDIwMUMyNDEgMTEzIDE2MiA0MSAxMTIgNDFDOTEgNDEgODMgNTIgODMgNzFDODMgMTE5IDEzOSAyMTUgMTk2IDMwMUMyMzEgMzAyIDI2OCAzMDMgMjk0IDMwM0MzMDIgMzAzIDMwNSAzMDggMzA1IDMxNEMzMDUgMzMwIDI4NyAzNTUgMjUyIDM2MEMyNTAgMzYxIDI0NCAzNjEgMjM2IDM2MUMyNTMgMzg3IDI3MCA0MDkgMjgyIDQyN0MyODYgNDMzIDI4OCA0NDAgMjg4IDQ0OEMyODggNDc1IDI2NiA1MDggMjUwIDUwOEMyNDcgNTA4IDI0NCA1MDYgMjQxIDUwM0MyMzEgNDkyIDE4NyA0MzEgMTQwIDM1OUMxMTIgMzU4IDg2IDM1NiA3MCAzNTRDNjIgMzUzIDU5IDM0OSA1OSAzNDNDNTkgMzI4IDgwIDMwNSAxMDIgMzAwQzU1IDIyNCAxNSAxNDUgMTUgMTA0QzE1IDY3IDUwIC0zIDEyNyAtM1oiIGZpbGw9InVybCgjdGV4dC1ncmFkaWVudC1zdWJ0bGUpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTMuNTk1LCAyMDApIHNjYWxlKDAuMTY1LCAtMC4xNjUpIiAvPgogICAgPHBhdGggZD0iTTE0MyAtM0MyMDYgLTMgMjQxIDMzIDI0MSA5NUMyNDEgMTM3IDIyOCAyMjIgMjI4IDI1OUMyMjggMzA0IDI0NSAzMjUgMjY5IDM1NUMyNzMgMzU5IDI3NCAzNjMgMjc0IDM2OEMyNzQgMzg4IDI0MSA0MTYgMjE2IDQxNkMyMDcgNDE2IDE5OSA0MTMgMTk0IDQwNUMxNzAgMzcyIDU2IDIxOCAxMyAxNTFDMyAxNDQgLTUgMTMwIC01IDEwOUMtNSA2MiA1OCAtMyAxNDMgLTNaTTEyMSAzNUM5MiAzNSA2MiA4MyA1OSAxMTVDOTYgMTYyIDEzMiAyMjcgMTYxIDI3M1YxODFDMTYxIDg1IDE1OCAzNSAxMjEgMzVaIiBmaWxsPSJ1cmwoI3RleHQtZ3JhZGllbnQtc3VidGxlKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDk1LjM0MDAwMDAwMDAwMDAzLCAyMDApIHNjYWxlKDAuMTY1LCAtMC4xNjUpIiAvPgogICAgPHBhdGggZD0iTTEwMyAtMkMxMzcgLTIgMTc2IDI1IDIxMyA3M0MyMjYgMzcgMjU5IDAgMzAxIDBDMzUyIDAgNDE0IDUyIDQ3MSAxMzdDNDc1IDE0NSA0NzYgMTU1IDQ3NiAxNjRDNDc2IDE4NiA0NjYgMjA3IDQ1NSAyMDdDNDUyIDIwNyA0NDggMjA1IDQ0NSAyMDFDMzkxIDEyMSAzMjQgNDggMjgzIDQ4QzI3MiA0OCAyNjggNTQgMjY4IDY0QzI2OCAxMTIgMzQxIDIyMyAzNzkgMjczQzM4MiAyNzYgMzgzIDI4MCAzODMgMjg0QzM4MyAzMDIgMzU0IDMyNSAzMzMgMzI1QzMyOCAzMjUgMzIzIDMyMyAzMTkgMzE5QzI5OSAzNDUgMjU5IDM3NSAyMjYgMzc1QzE0NCAzNzUgMTAgMTg0IDEwIDk1QzEwIDQ0IDU4IC0yIDEwMyAtMlpNODggNDJDNzggNDIgNzMgNDkgNzMgNjBDNzMgMTIzIDIwNiAzMjIgMjYzIDMyMkMyNzMgMzIyIDI3NyAzMTYgMjc3IDMwNUMyNzcgMjQ0IDE0NSA0MiA4OCA0MloiIGZpbGw9InVybCgjdGV4dC1ncmFkaWVudC1zdWJ0bGUpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1NDQuMDE1LCAyMDApIHNjYWxlKDAuMTY1LCAtMC4xNjUpIiAvPgogIDwvZz4KICA8dGV4dCB4PSIyNjUiIHk9IjI3NSIgZmlsbD0iIzFFM0E1MiIgZm9udC1mYW1pbHk9IidIZWx2ZXRpY2EgTmV1ZScsICdBcmlhbCcsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDIiIGZvbnQtd2VpZ2h0PSIzMDAiIGxldHRlci1zcGFjaW5nPSIyIj5IaXJlLiBCdWlsZC4gTGF1bmNoLjwvdGV4dD4KPC9zdmc+'

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml(title: string, bodyHtml: string, actionLabel?: string, actionUrl?: string): string {
  const actionButton = actionLabel
    ? `<tr><td align="center" style="padding:24px 0 0;">
        <a href="${actionUrl ?? '#'}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#386BB7,#E24C4A);color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">${actionLabel}</a>
       </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,82,0.10);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1E3A52 0%,#253f5e 100%);padding:28px 40px;text-align:center;">
          <img src="${LOGO_DATA_URI}" alt="Gritsa" width="220" height="110" style="display:block;margin:0 auto;" />
        </td>
      </tr>

      <!-- Accent bar -->
      <tr><td style="height:4px;background:linear-gradient(90deg,#386BB7,#E24C4A);"></td></tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px 28px;">
          <h2 style="margin:0 0 20px;color:#1E3A52;font-size:22px;font-weight:700;line-height:1.3;">${title}</h2>
          ${bodyHtml}
          ${actionButton}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f7fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#718096;font-size:12px;line-height:1.6;">
            This is an automated notification from the <strong>Gritsa Employee Portal</strong>.<br/>
            Please do not reply to this email.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

function bodyText(lines: string[]): string {
  return lines
    .map((l) => `<p style="margin:0 0 12px;color:#2d3748;font-size:14px;line-height:1.7;">${l}</p>`)
    .join('')
}

function detailTable(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:8px 12px;background:#f7fafc;color:#718096;font-size:13px;font-weight:600;white-space:nowrap;width:40%;border-bottom:1px solid #e2e8f0;">${k}</td>
          <td style="padding:8px 12px;color:#2d3748;font-size:13px;border-bottom:1px solid #e2e8f0;">${v}</td>
        </tr>`,
    )
    .join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0;">${trs}</table>`
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    Approved: '#276749',
    Rejected: '#c53030',
    Pending: '#975a16',
    Draft: '#2b6cb0',
    Submitted: '#2b6cb0',
    Paid: '#276749',
  }
  const bg: Record<string, string> = {
    Approved: '#c6f6d5',
    Rejected: '#fed7d7',
    Pending: '#fefcbf',
    Draft: '#bee3f8',
    Submitted: '#bee3f8',
    Paid: '#c6f6d5',
  }
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg[status] ?? '#e2e8f0'};color:${colors[status] ?? '#2d3748'};font-size:12px;font-weight:700;">${status}</span>`
}

// ── Notification builders ─────────────────────────────────────────────────────
type NotificationType =
  | 'leave_submitted'
  | 'leave_reviewed'
  | 'expense_submitted'
  | 'expense_reviewed'
  | 'payslip_generated'
  | 'document_uploaded'

interface NotificationPayload {
  type: NotificationType
  to_email: string
  to_name?: string
  data: Record<string, string | number>
}

function buildNotification(payload: NotificationPayload): { subject: string; html: string } {
  const { type, to_name, data } = payload
  const recipient = to_name || 'there'
  const portalUrl = 'https://gritsa.github.io'

  switch (type) {
    case 'leave_submitted': {
      const subject = `Leave Request from ${data.employee_name}`
      const html = buildEmailHtml(
        `New Leave Request`,
        bodyText([`Hi ${recipient},`, `<strong>${data.employee_name}</strong> has submitted a leave request and it awaits your review.`]) +
          detailTable([
            ['Employee', String(data.employee_name)],
            ['Leave Type', String(data.leave_type)],
            ['From', String(data.from_date)],
            ['To', String(data.to_date)],
            ['Days', String(data.days)],
            ['Reason', String(data.reason)],
          ]),
        'Review Leave Request',
        `${portalUrl}/manager`,
      )
      return { subject, html }
    }

    case 'leave_reviewed': {
      const approved = data.status === 'Approved'
      const subject = `Your Leave Request has been ${data.status}`
      const html = buildEmailHtml(
        `Leave Request ${data.status}`,
        bodyText([
          `Hi ${recipient},`,
          `Your leave request has been reviewed. Status: ${statusBadge(String(data.status))}`,
          ...(data.review_comments ? [`<em>Comment:</em> "${data.review_comments}"`] : []),
        ]) +
          detailTable([
            ['Leave Type', String(data.leave_type)],
            ['From', String(data.from_date)],
            ['To', String(data.to_date)],
            ['Days', String(data.days)],
            ['Status', approved ? '✅ Approved' : '❌ Rejected'],
          ]),
        'View My Leaves',
        `${portalUrl}/leaves`,
      )
      return { subject, html }
    }

    case 'expense_submitted': {
      const subject = `Expense Claim from ${data.employee_name}`
      const html = buildEmailHtml(
        `New Expense Claim`,
        bodyText([`Hi ${recipient},`, `<strong>${data.employee_name}</strong> has submitted an expense claim for your approval.`]) +
          detailTable([
            ['Employee', String(data.employee_name)],
            ['Title', String(data.title)],
            ['Category', String(data.category)],
            ['Date', String(data.expense_date)],
            ['Amount', `₹${Number(data.amount).toFixed(2)}`],
            ...(data.description ? [['Description', String(data.description)] as [string, string]] : []),
          ]),
        'Review Expense',
        `${portalUrl}/manager`,
      )
      return { subject, html }
    }

    case 'expense_reviewed': {
      const subject = `Your Expense Claim has been ${data.status}`
      const html = buildEmailHtml(
        `Expense Claim ${data.status}`,
        bodyText([
          `Hi ${recipient},`,
          `Your expense claim has been reviewed. Status: ${statusBadge(String(data.status))}`,
          ...(data.review_comments ? [`<em>Comment:</em> "${data.review_comments}"`] : []),
        ]) +
          detailTable([
            ['Title', String(data.title)],
            ['Amount', `₹${Number(data.amount).toFixed(2)}`],
            ['Status', String(data.status)],
            ...(data.payslip_month != null ? [['Payslip', `${data.payslip_month} ${data.payslip_year}`] as [string, string]] : []),
          ]),
        'View My Expenses',
        `${portalUrl}/expenses`,
      )
      return { subject, html }
    }

    case 'payslip_generated': {
      const subject = `Your Payslip for ${data.month} ${data.year} is Ready`
      const html = buildEmailHtml(
        `Payslip — ${data.month} ${data.year}`,
        bodyText([`Hi ${recipient},`, `Your payslip for <strong>${data.month} ${data.year}</strong> has been generated and is now available in the portal.`]) +
          detailTable([
            ['Month', `${String(data.month)} ${String(data.year)}`],
            ['Gross Earnings', `₹${Number(data.gross_salary).toFixed(2)}`],
            ...(data.expense_reimbursement && Number(data.expense_reimbursement) > 0
              ? [['Expense Reimbursement', `₹${Number(data.expense_reimbursement).toFixed(2)}`] as [string, string]]
              : []),
            ['Total Deductions', `₹${Number(data.total_deductions).toFixed(2)}`],
            ['Net Salary', `₹${Number(data.net_salary).toFixed(2)}`],
            ['Status', statusBadge(String(data.status))],
          ]),
        'View Payslip',
        `${portalUrl}/my-space`,
      )
      return { subject, html }
    }

    case 'document_uploaded': {
      const subject = `New Document: ${data.document_name}`
      const html = buildEmailHtml(
        `Document Uploaded`,
        bodyText([`Hi ${recipient},`, `A new document has been uploaded to your profile by HR.`]) +
          detailTable([
            ['Document Name', String(data.document_name)],
            ['Type', String(data.document_type)],
            ['Uploaded By', String(data.uploaded_by_name || 'HR')],
          ]),
        'View Documents',
        `${portalUrl}/my-space`,
      )
      return { subject, html }
    }

    default:
      return { subject: 'Gritsa Portal Notification', html: buildEmailHtml('Notification', bodyText(['You have a new notification.'])) }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: NotificationPayload = await req.json()

    if (!payload.type || !payload.to_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, to_email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = buildNotification(payload)

    // Send via Gmail SMTP
    const smtpUser = Deno.env.get('SMTP_USER') ?? ''
    const smtpPass = Deno.env.get('SMTP_PASS') ?? ''

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"Gritsa Portal" <${smtpUser}>`,
      to: payload.to_email,
      subject,
      html,
    })

    console.log(`Notification sent: type=${payload.type} to=${payload.to_email}`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-notification error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
