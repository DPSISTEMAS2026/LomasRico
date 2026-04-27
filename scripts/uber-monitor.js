/**
 * 🔔 Uber Eats Order Monitor
 * Polls every 30 seconds for new orders and displays details
 */
require('dotenv').config({ path: 'apps/api/.env' });

const cookie = process.env.UBER_EATS_COOKIE;
const csrfToken = process.env.UBER_EATS_CSRF_TOKEN || 'x';
const POLL_INTERVAL = 30000; // 30 seconds

const payload = {"operationName":"GetActiveOrders","variables":{"getActiveOrdersRequest":{"storeID":"9b61ddd3-f68c-53ad-a1a3-435f20fe87d2","locale":"es-ES"}},"query":"fragment RichTextElement on TextElement {\n  predefinedDecorations\n  text {\n    text\n    font {\n      style\n      weight\n      __typename\n    }\n    color\n    __typename\n  }\n  __typename\n}\n\nfragment RichTextFields on RichText {\n  richTextElements {\n    ...RichTextElement\n    __typename\n  }\n  accessibilityText\n  __typename\n}\n\nfragment PriceFields on Price {\n  amount\n  currencyAmount {\n    amountE5\n    currencyCode\n    formatted\n    __typename\n  }\n  priceModification {\n    type\n    discount {\n      formattedDiscountedPrice\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment IllustrationFields on RichIllustration {\n  illustration {\n    __typename\n    ... on StyledIcon {\n      icon\n      size\n      color\n      backgroundColor\n      __typename\n    }\n  }\n  __typename\n}\n\nfragment IconFields on IllustrationViewModel {\n  content {\n    ...IllustrationFields\n    __typename\n  }\n  accessibilityText\n  __typename\n}\n\nfragment NoteFields on Note {\n  icon {\n    ...IconFields\n    __typename\n  }\n  title {\n    content {\n      richTextElements {\n        ... on TextElement {\n          ...RichTextElement\n          __typename\n        }\n        __typename\n      }\n      accessibilityText\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment CartItemFields on CartItem {\n  id\n  actions {\n    icon {\n      ...IconFields\n      __typename\n    }\n    type\n    __typename\n  }\n  cartID\n  imageURL\n  itemID\n  modifiers {\n    __typename\n    ... on Modifier {\n      id\n      name\n      nestingDepth\n      icon {\n        ...IconFields\n        __typename\n      }\n      __typename\n    }\n    ... on ModifierOption {\n      itemID\n      id\n      name\n      nestingDepth\n      quantity {\n        amount\n        __typename\n      }\n      price {\n        ...PriceFields\n        __typename\n      }\n      __typename\n    }\n  }\n  name\n  notes {\n    ...NoteFields\n    __typename\n  }\n  price {\n    ...PriceFields\n    __typename\n  }\n  quantity {\n    amount\n    __typename\n  }\n  __typename\n}\n\nfragment Phone on Phone {\n  countryCode\n  phoneNumber\n  pinCode\n  __typename\n}\n\nfragment DeliveryPartnerFields on DeliveryPartner {\n  id\n  name\n  pictureUrl\n  phone {\n    ...Phone\n    __typename\n  }\n  locationV2 {\n    latitude\n    longitude\n    __typename\n  }\n  feedback {\n    rating\n    reason {\n      key\n      displayText\n      __typename\n    }\n    __typename\n  }\n  vehicle {\n    make\n    __typename\n  }\n  stats {\n    satisfactionRating\n    numberOfOrdersDelivered\n    __typename\n  }\n  deliveryPartnerBlockStatus {\n    blockStatus\n    __typename\n  }\n  __typename\n}\n\nfragment DeliveriesFields on Delivery {\n  id\n  state\n  deliveryPartner {\n    id\n    name\n    pictureUrl\n    phone {\n      ...Phone\n      __typename\n    }\n    locationV2 {\n      latitude\n      longitude\n      __typename\n    }\n    feedback {\n      rating\n      reason {\n        key\n        displayText\n        __typename\n      }\n      __typename\n    }\n    vehicle {\n      make\n      __typename\n    }\n    stats {\n      satisfactionRating\n      numberOfOrdersDelivered\n      __typename\n    }\n    deliveryPartnerBlockStatus {\n      blockStatus\n      __typename\n    }\n    __typename\n  }\n  previouslyAssignedDeliveryPartners {\n    ...DeliveryPartnerFields\n    __typename\n  }\n  avUnlockInfo {\n    passCode\n    instructions {\n      ...RichTextFields\n      __typename\n    }\n    __typename\n  }\n  estimatedPickUpTime {\n    relativeFromNowSecs\n    __typename\n  }\n  estimatedDropOffTime\n  actualDropOffTime\n  deliveryPartnerIsWaitingTime {\n    relativeFromNowSecs\n    __typename\n  }\n  location {\n    latitude\n    longitude\n    title\n    addressOne\n    subtitle\n    aptOrSuite\n    businessName\n    street\n    region\n    city\n    postalCode\n    country\n    addressFieldWithLabels {\n      labelKey\n      labelVal\n      __typename\n    }\n    __typename\n  }\n  interactionType\n  deliveryInstructions\n  isDeliveryPartnerArrivingWithinPrepTime\n  __typename\n}\n\nfragment TextElementFields on TextElement {\n  predefinedDecorations\n  text {\n    text\n    font {\n      style\n      weight\n      __typename\n    }\n    color\n    __typename\n  }\n  __typename\n}\n\nfragment BannerFields on BannerViewModel {\n  bannerState\n  cornerRadius\n  maxNumberOfLines\n  customArtwork {\n    accessibilityText\n    illustration {\n      ...IllustrationFields\n      __typename\n    }\n    __typename\n  }\n  headline {\n    richTextElements {\n      __typename\n      ... on TextElement {\n        ...TextElementFields\n        __typename\n      }\n    }\n    __typename\n  }\n  actionButton {\n    actionButtonLayout\n    hierarchy\n    illustration {\n      ...IllustrationFields\n      __typename\n    }\n    title {\n      richTextElements {\n        __typename\n        ... on TextElement {\n          ...TextElementFields\n          __typename\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n  action {\n    __typename\n    ... on DmcModalAction {\n      orderData {\n        orderID\n        __typename\n      }\n      __typename\n    }\n  }\n  message {\n    richTextElements {\n      __typename\n      ... on TextElement {\n        ...TextElementFields\n        __typename\n      }\n    }\n    __typename\n  }\n  contentColor {\n    __typename\n    ... on SemanticTextColorUnionValue {\n      value\n      __typename\n    }\n  }\n  bannerColor {\n    __typename\n    ... on SemanticBackgroundColorUnionValue {\n      value\n      __typename\n    }\n  }\n  __typename\n}\n\nfragment TagFields on TagViewModel {\n  text\n  identifier\n  isToggleable\n  isDismissable\n  leadingIcon\n  size\n  style {\n    __typename\n    ... on TagViewModelCustomStyleData {\n      __typename\n      activeBackgroundColor\n      activeBorderColor\n      activeContentColor {\n        __typename\n        ... on SemanticTextColorUnionValue {\n          value\n          __typename\n        }\n      }\n      inactiveBackgroundColor\n      inactiveBorderColor\n      inactiveContentColor {\n        __typename\n        ... on SemanticTextColorUnionValue {\n          value\n          __typename\n        }\n      }\n    }\n  }\n  __typename\n}\n\nfragment OptionUI on OptionUIState {\n  isDisabled\n  disabledReason\n  __typename\n}\n\nfragment FulfillmentQuantityFields on FulfillmentQuantity {\n  amount\n  unit {\n    measurementType\n    weight {\n      unitType\n      __typename\n    }\n    __typename\n  }\n  formattedValue\n  __typename\n}\n\nfragment OrderItemSpecificationFields on OrderItemSpecification {\n  itemID\n  title\n  sku\n  imageURL\n  sectionID\n  sectionTitle\n  subsectionID\n  subsectionTitle\n  totalPrice {\n    ...PriceFields\n    __typename\n  }\n  unitPrice {\n    ...PriceFields\n    __typename\n  }\n  quantityInSoldByUnit {\n    ...FulfillmentQuantityFields\n    __typename\n  }\n  quantityInPricedByUnit {\n    ...FulfillmentQuantityFields\n    __typename\n  }\n  notes {\n    ...NoteFields\n    __typename\n  }\n  actions {\n    type\n    label\n    __typename\n  }\n  __typename\n}\n\nfragment ItemFulfillmentNegotiationProposalFields on ItemFulfillmentNegotiationProposal {\n  proposalID\n  replacements {\n    ...OrderItemSpecificationFields\n    __typename\n  }\n  __typename\n}\n\nfragment OrderDetails on MerchantOrder {\n  shouldShowReadyConfirmModal\n  highRiskOrderModalInfo {\n    title {\n      ...RichTextFields\n      __typename\n    }\n    message {\n      ...RichTextFields\n      __typename\n    }\n    __typename\n  }\n  fulfillmentType\n  id\n  customers {\n    customerID\n    name\n    orderHistory {\n      pastOrderCount\n      __typename\n    }\n    phone {\n      ...Phone\n      __typename\n    }\n    canRespondToFulfillmentIssues\n    taxProfiles {\n      taxProfileMetadataList {\n        key\n        label\n        barcodeData {\n          barcodeText\n          barcodeType\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  terminalStateTimestamp\n  callPartyInfos {\n    text\n    id\n    party\n    phone {\n      ...Phone\n      __typename\n    }\n    option {\n      ...OptionUI\n      __typename\n    }\n    __typename\n  }\n  deliveries {\n    ...DeliveriesFields\n    __typename\n  }\n  cancellationInfo {\n    title\n    subtitle\n    __typename\n  }\n  displayID\n  state\n  itemCount\n  cartInfo {\n    __typename\n    ... on CartGroupsList {\n      cartItemGroups {\n        groupName\n        groupItemCountText\n        items {\n          ...CartItemFields\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on CartItemList {\n      cartItems {\n        ...CartItemFields\n        __typename\n      }\n      __typename\n    }\n  }\n  payment {\n    lineItems {\n      label {\n        content {\n          richTextElements {\n            __typename\n            ... on TextElement {\n              ...TextElementFields\n              __typename\n            }\n          }\n          accessibilityText\n          __typename\n        }\n        __typename\n      }\n      value {\n        content {\n          richTextElements {\n            __typename\n            ... on TextElement {\n              ...TextElementFields\n              __typename\n            }\n          }\n          accessibilityText\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    orderTotal {\n      amountE5\n      currencyCode\n      formatted\n      __typename\n    }\n    orderSubTotal {\n      amountE5\n      currencyCode\n      formatted\n      __typename\n    }\n    __typename\n  }\n  estimatedReadyTime {\n    relativeFromNowSecs\n    isTimeIncrease\n    timestamp\n    __typename\n  }\n  estimatedUnfulfilledAt {\n    relativeFromNowSecs\n    isTimeIncrease\n    timestamp\n    __typename\n  }\n  banners {\n    ...BannerFields\n    __typename\n  }\n  tags {\n    ...TagFields\n    __typename\n  }\n  adjustOrderOptions {\n    priceAdjustment {\n      ...OptionUI\n      __typename\n    }\n    outOfItem {\n      ...OptionUI\n      __typename\n    }\n    cantComplete {\n      ...OptionUI\n      __typename\n    }\n    adjustReadyTime {\n      ...OptionUI\n      __typename\n    }\n    cancelOrder {\n      ...OptionUI\n      __typename\n    }\n    adjustETDTime {\n      ...OptionUI\n      __typename\n    }\n    customerRequestETD {\n      ...OptionUI\n      __typename\n    }\n    __typename\n  }\n  taxRateOptions\n  scheduledOrderInfo {\n    title {\n      ...RichTextFields\n      __typename\n    }\n    prepTimeSubtitle {\n      ...RichTextFields\n      __typename\n    }\n    scheduledDateAndTime\n    __typename\n  }\n  prepTimeSecs\n  cannotAdjustReadyForPickupTime\n  shopperAssignment {\n    isAssigned\n    assignedShoppers {\n      shopperID {\n        deviceID\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  shoppingCart {\n    shoppingLists {\n      type\n      label\n      itemGroups {\n        type\n        id\n        label\n        itemIDs\n        __typename\n      }\n      __typename\n    }\n    orderItems {\n      key\n      value {\n        id\n        cartID\n        fulfillmentStatus {\n          type\n          label\n          __typename\n        }\n        fulfillmentPreference {\n          type\n          label\n          itemSubstitutes {\n            ...OrderItemSpecificationFields\n            __typename\n          }\n          __typename\n        }\n        currentItem {\n          ...OrderItemSpecificationFields\n          __typename\n        }\n        originalItem {\n          ...OrderItemSpecificationFields\n          __typename\n        }\n        merchantProposals {\n          ...ItemFulfillmentNegotiationProposalFields\n          __typename\n        }\n        consumerProposals {\n          ...ItemFulfillmentNegotiationProposalFields\n          __typename\n        }\n        consumerID\n        __typename\n      }\n      __typename\n    }\n    isShoppingEnabled\n    isShoppingEnabledV2\n    shoppingStatus {\n      type\n      label\n      progressPercentage\n      subtitle\n      title\n      iconColor\n      __typename\n    }\n    __typename\n  }\n  orderTrackingMetadata {\n    url\n    png\n    assignedCouriers {\n      courierUUID\n      courierName\n      __typename\n    }\n    batchOrderUUID\n    __typename\n  }\n  cancellationConfig {\n    cancellationReasons {\n      displayText\n      reasonCode\n      __typename\n    }\n    __typename\n  }\n  feedbackConfig {\n    isDeliveryFeedbackDisabled\n    deliveryFeedbackDisabledReason\n    __typename\n  }\n  estimatedThirdPartyDeliveryTime {\n    delivery_time\n    __typename\n  }\n  estimatedBYOCDeliveryTime {\n    relativeFromNowSecs\n    isTimeIncrease\n    timestamp\n    __typename\n  }\n  posInjectionFailureInfo {\n    title {\n      ...RichTextFields\n      __typename\n    }\n    subtitle {\n      ...RichTextFields\n      __typename\n    }\n    button {\n      ...RichTextFields\n      __typename\n    }\n    cardWarning {\n      ...RichTextFields\n      __typename\n    }\n    __typename\n  }\n  dmcOrderInfo {\n    dmcModalText {\n      title {\n        ...RichTextFields\n        __typename\n      }\n      infoSubtitle {\n        ...RichTextFields\n        __typename\n      }\n      infoComment {\n        ...RichTextFields\n        __typename\n      }\n      __typename\n    }\n    showDmcOptionInAdjustOrderMenu\n    __typename\n  }\n  orderOverviewTags {\n    ...TagFields\n    __typename\n  }\n  __typename\n}\n\nquery GetActiveOrders($getActiveOrdersRequest: GetActiveOrdersRequest__Input!) {\n  getActiveOrders(request: $getActiveOrdersRequest) {\n    code\n    success\n    message\n    result {\n      orders {\n        key\n        value {\n          ...OrderDetails\n          __typename\n        }\n        __typename\n      }\n      orderCards {\n        cardID\n        sortPriority\n        orderType {\n          __typename\n          ... on SingleOrder {\n            id\n            __typename\n          }\n          ... on BatchedOrder {\n            merchantOrderIds\n            referencedOrderIds\n            __typename\n          }\n        }\n        backgroundColor\n        column\n        section {\n          header {\n            title {\n              ...RichTextFields\n              __typename\n            }\n            __typename\n          }\n          sortPriority\n          id\n          __typename\n        }\n        textColor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"};

const seenOrders = new Set();
let pollCount = 0;
let errorCount = 0;

function timestamp() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function extractItems(order) {
  // Items can be in cartItems or cartItemGroups
  const cartInfo = order.cartInfo;
  if (!cartInfo) return [];
  
  if (cartInfo.cartItems) return cartInfo.cartItems;
  if (cartInfo.cartItemGroups) {
    return cartInfo.cartItemGroups.flatMap(g => g.items || []);
  }
  return [];
}

async function poll() {
  pollCount++;
  try {
    const res = await fetch('https://merchants-beta.ubereats.com/graphql', {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'X-Csrf-Token': csrfToken,
        'Origin': 'https://merchants-beta.ubereats.com',
        'Referer': 'https://merchants-beta.ubereats.com/orders/overview',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 403 || res.status === 401) {
      console.log(`\n⚠️  [${timestamp()}] Cookie expirada! Renueva la cookie en .env y reinicia el monitor.`);
      process.exit(1);
    }

    const data = await res.json();
    const result = data.data?.getActiveOrders;
    
    if (!result?.success) {
      console.log(`  ❌ [${timestamp()}] Error: ${result?.message || 'Unknown'}`);
      errorCount++;
      if (errorCount > 5) {
        console.log('\n🛑 Demasiados errores seguidos. Revisa la cookie.');
        process.exit(1);
      }
      return;
    }

    errorCount = 0;
    const orders = result.result?.orders || [];
    
    // Check for new orders
    for (const o of orders) {
      const order = o.value;
      const orderId = order.id || o.key;
      
      if (!seenOrders.has(orderId)) {
        seenOrders.add(orderId);
        
        const customer = order.customers?.[0];
        const items = extractItems(order);
        const delivery = order.deliveries?.[0];
        
        console.log('\n' + '═'.repeat(60));
        console.log(`🔔🔔🔔 NUEVO PEDIDO UBER EATS! [${timestamp()}]`);
        console.log('═'.repeat(60));
        console.log(`  🆔 ID: ${order.displayID}`);
        console.log(`  📊 Estado: ${order.state}`);
        console.log(`  🍽️ Tipo: ${order.fulfillmentType}`);
        console.log(`  👤 Cliente: ${customer?.name || 'N/A'}`);
        console.log(`  📱 Teléfono: ${customer?.phone ? `+${customer.phone.countryCode}${customer.phone.phoneNumber}` : 'N/A'}`);
        console.log(`  📦 Items (${order.itemCount}):`);
        
        items.forEach(item => {
          const qty = item.quantity?.amount || 1;
          const price = item.price?.currencyAmount?.formatted || item.price?.amount || '';
          console.log(`     ${qty}x ${item.name} — ${price}`);
          
          // Show modifiers
          if (item.modifiers?.length) {
            item.modifiers.forEach(mod => {
              if (mod.__typename === 'ModifierOption') {
                const modPrice = mod.price?.currencyAmount?.formatted || '';
                console.log(`        ↳ ${mod.name} ${modPrice}`);
              } else if (mod.__typename === 'Modifier') {
                console.log(`        📝 ${mod.name}`);
              }
            });
          }
          
          // Show notes
          if (item.notes?.length) {
            item.notes.forEach(note => {
              const noteText = note.title?.content?.richTextElements
                ?.map(e => e.text?.text)
                .filter(Boolean)
                .join(' ') || '';
              if (noteText) console.log(`        💬 "${noteText}"`);
            });
          }
        });
        
        // Delivery info
        if (delivery?.location) {
          const loc = delivery.location;
          console.log(`  📍 Dirección: ${loc.addressOne || ''} ${loc.street || ''}, ${loc.city || ''}`);
          if (delivery.deliveryInstructions) {
            console.log(`  📝 Instrucciones: ${delivery.deliveryInstructions}`);
          }
        }
        
        // Payment
        const total = order.payment?.orderTotal?.formatted;
        const subtotal = order.payment?.orderSubTotal?.formatted;
        if (total) console.log(`  💰 Total: ${total}`);
        if (subtotal) console.log(`  💵 Subtotal: ${subtotal}`);
        
        // Prep time
        if (order.prepTimeSecs) {
          console.log(`  ⏱️ Tiempo prep: ${Math.round(order.prepTimeSecs / 60)} min`);
        }
        
        // Delivery partner
        if (delivery?.deliveryPartner) {
          const dp = delivery.deliveryPartner;
          console.log(`  🛵 Repartidor: ${dp.name} (${dp.vehicle?.make || 'N/A'})`);
        }
        
        console.log('═'.repeat(60));
        
        // Save order detail
        const fs = require('fs');
        fs.writeFileSync(`uber-order-${order.displayID || orderId}.json`, JSON.stringify(order, null, 2));
        console.log(`  💾 Detalle guardado en uber-order-${order.displayID || orderId}.json`);
      }
    }
    
    // Status line (compact, every 10 polls)
    if (pollCount % 10 === 0) {
      console.log(`  ⏳ [${timestamp()}] Poll #${pollCount} — ${orders.length} pedidos activos | ${seenOrders.size} vistos en total`);
    }
    
  } catch (err) {
    console.log(`  ❌ [${timestamp()}] Error de red: ${err.message}`);
    errorCount++;
  }
}

// Start
console.log('═'.repeat(60));
console.log('🔔 UBER EATS ORDER MONITOR — Lo Más Rico');
console.log(`⏰ Polling cada ${POLL_INTERVAL / 1000}s | Iniciado: ${timestamp()}`);
console.log('   Ctrl+C para detener');
console.log('═'.repeat(60));

// Initial poll
poll();

// Continue polling
setInterval(poll, POLL_INTERVAL);
