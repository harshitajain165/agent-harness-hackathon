import Stripe from "stripe";

const PAGE_CAP = 2000;

export type AttributedStripeRevenue = {
  connected: boolean;
  total: number;
  payments: number;
  subscriptions: number;
  currency: "usd";
  truncated?: boolean;
};

const EMPTY: AttributedStripeRevenue = {
  connected: false,
  total: 0,
  payments: 0,
  subscriptions: 0,
  currency: "usd",
};

function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

function attributedVideoId(
  metadata: Stripe.Metadata | null | undefined,
  allowed: Set<string>,
): string | null {
  if (!metadata) return null;
  const raw = metadata.video_id || metadata.post_id;
  if (!raw || !allowed.has(raw)) return null;
  return raw;
}

function videoIdFromCharge(charge: Stripe.Charge, allowed: Set<string>): string | null {
  const fromCharge = attributedVideoId(charge.metadata, allowed);
  if (fromCharge) return fromCharge;

  const intent = charge.payment_intent;
  if (intent && typeof intent !== "string") {
    return attributedVideoId(intent.metadata, allowed);
  }
  return null;
}

function videoIdFromInvoice(invoice: Stripe.Invoice, allowed: Set<string>): string | null {
  const fromInvoice = attributedVideoId(invoice.metadata, allowed);
  if (fromInvoice) return fromInvoice;

  const subscription = invoice.parent?.subscription_details?.metadata
    ? attributedVideoId(invoice.parent.subscription_details.metadata, allowed)
    : null;
  if (subscription) return subscription;

  const lines = invoice.lines?.data ?? [];
  for (const line of lines) {
    const fromLine = attributedVideoId(line.metadata, allowed);
    if (fromLine) return fromLine;
  }
  return null;
}

function objectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function invoicePaymentIds(invoice: Stripe.Invoice): { charges: Set<string>; intents: Set<string> } {
  const charges = new Set<string>();
  const intents = new Set<string>();
  for (const payment of invoice.payments?.data ?? []) {
    const chargeId = objectId(payment.payment.charge);
    const intentId = objectId(payment.payment.payment_intent);
    if (chargeId) charges.add(chargeId);
    if (intentId) intents.add(intentId);
  }
  return { charges, intents };
}

async function collect<T>(
  iterator: AsyncIterable<T>,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  for await (const item of iterator) {
    items.push(item);
    if (items.length >= PAGE_CAP) {
      return { items, truncated: true };
    }
  }
  return { items, truncated: false };
}

function invoiceNetPaid(
  invoice: Stripe.Invoice,
  chargeById: Map<string, Stripe.Charge>,
): number {
  const paid = invoice.amount_paid ?? 0;
  const paymentIds = invoicePaymentIds(invoice);
  let chargeRefunds = 0;
  for (const id of paymentIds.charges) {
    const charge = chargeById.get(id);
    if (charge) chargeRefunds += charge.amount_refunded ?? 0;
  }
  const creditNotes = invoice.post_payment_credit_notes_amount ?? 0;
  return Math.max(0, paid - Math.max(chargeRefunds, creditNotes));
}

export async function getAttributedStripeRevenue(
  videoIds: string[],
): Promise<AttributedStripeRevenue> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return EMPTY;

  const allowed = new Set(videoIds.filter(Boolean));
  if (allowed.size === 0) {
    return { ...EMPTY, connected: true };
  }

  const stripe = new Stripe(secret);

  const [chargePage, invoicePage] = await Promise.all([
    collect(
      stripe.charges.list({
        limit: 100,
        expand: ["data.payment_intent"],
      }),
    ),
    collect(
      stripe.invoices.list({
        status: "paid",
        limit: 100,
        expand: ["data.lines", "data.payments"],
      }),
    ),
  ]);

  const charges = chargePage.items;
  const invoices = invoicePage.items;
  const truncated = chargePage.truncated || invoicePage.truncated;
  const chargeById = new Map(charges.map((charge) => [charge.id, charge]));

  const invoiceChargeIds = new Set<string>();
  const invoiceIntentIds = new Set<string>();
  for (const invoice of invoices) {
    const ids = invoicePaymentIds(invoice);
    for (const id of ids.charges) invoiceChargeIds.add(id);
    for (const id of ids.intents) invoiceIntentIds.add(id);
  }

  let paymentsCents = 0;
  for (const charge of charges) {
    if (charge.currency !== "usd" || !charge.paid) continue;
    if (invoiceChargeIds.has(charge.id)) continue;
    const intentId = objectId(charge.payment_intent);
    if (intentId && invoiceIntentIds.has(intentId)) continue;
    if (!videoIdFromCharge(charge, allowed)) continue;
    paymentsCents += Math.max(0, charge.amount - (charge.amount_refunded ?? 0));
  }

  let subscriptionsCents = 0;
  for (const invoice of invoices) {
    if (invoice.currency !== "usd") continue;
    if (!videoIdFromInvoice(invoice, allowed)) continue;
    subscriptionsCents += invoiceNetPaid(invoice, chargeById);
  }

  const payments = centsToDollars(paymentsCents);
  const subscriptions = centsToDollars(subscriptionsCents);

  return {
    connected: true,
    total: Math.round((payments + subscriptions) * 100) / 100,
    payments,
    subscriptions,
    currency: "usd",
    truncated,
  };
}
