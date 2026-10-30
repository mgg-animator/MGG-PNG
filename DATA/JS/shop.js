const SHOP_ITEMS_URL = "https://s-beta.kobojo.com/mutants/gameconfig/shopitems.xml?v=Date.now()";
const LOCALISATION_URL = "https://s-beta.kobojo.com/mutants/gameconfig/localisation_es.txt?v=Date.now()";
const ASSET_BASE_URL = "https://s-beta.kobojo.com/mutants/assets/";
const DEFAULT_BACKGROUND_URL = `${ASSET_BASE_URL}hud/shop/fx_item_hc.png`;
const PRICE_BAR_URLS = {
  hardcurrency: "../IMG/shop_bar_hc.png",
  softcurrency: "../IMG/shop_bar_sc.png",
  realcurrency: "../IMG/shop_bar_rc.png"
};

function getTagValue(item, key) {
  const tags = item.getElementsByTagName("Tag");
  for (const tag of tags) {
    if (tag.getAttribute("key") === key) {
      return tag.getAttribute("value");
    }
  }
  return "";
}

function formatAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return amount;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value).replace(/,/g, " ");
}

function createImage(className, source, alt = "") {
  const image = document.createElement("img");
  image.className = className;
  image.src = source;
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function getItemPicture(item) {
  let picture = item.getAttribute("picture");
  if (!picture) {
    return "";
  }

  picture = picture.replace(/\$\$/g, "-es");
  if (picture.toLowerCase().startsWith("specimen")) {
    const firstArticle = item.getElementsByTagName("ArticleItem")[0];
    if (firstArticle) {
      const skin = Array.from(firstArticle.getElementsByTagName("Tag"))
        .find(tag => tag.getAttribute("key") === "skin")
        ?.getAttribute("value");
      if (skin && !picture.toLowerCase().endsWith(`_${skin.toLowerCase()}`)) {
        picture += `_${skin}`;
      }
    }
  }

  return picture;
}

function createItemCard(item, localisation) {
  const card = document.createElement("div");
  card.className = "item";

  const itemName = item.getAttribute("itemId");
  const displayName = localisation.get(itemName)
    || localisation.get(`${itemName}_payment_text`)
    || itemName;
  const background = getTagValue(item, "bg");
  card.append(createImage(
    "background",
    background
      ? `${ASSET_BASE_URL}hud/shop/fx_item_hc_${background}.png`
      : DEFAULT_BACKGROUND_URL
  ));

  const picture = getItemPicture(item);
  if (picture) {
    const isSpecimen = picture.toLowerCase().startsWith("specimen");
    card.append(createImage(
      isSpecimen ? "mutant" : "object",
      `${ASSET_BASE_URL}thumbnails/${picture}.png`,
      itemName
    ));

    if (isSpecimen) {
      const article = item.getElementsByTagName("ArticleItem")[0];
      const typeId = article?.getAttribute("typeId") || "";
      const gene = typeId.match(/^Specimen_([A-Za-z])/i)?.[1];
      if (gene) {
        card.append(createImage(
          "platform",
          `${ASSET_BASE_URL}hud/shop/flap/base_${gene.toLowerCase()}_big.png`
        ));
      }
    }
  }

  const offerTag = item.getAttribute("offerTag") || item.getAttribute("offertag");
  if (offerTag) {
    card.append(createImage(
      "tag",
      `${ASSET_BASE_URL}offertags/${offerTag.replace(/\$\$/g, "-es")}.png`
    ));
  }

  const cost = item.getElementsByTagName("Cost")[0];
  const realPrices = Array.from(item.getElementsByTagName("RealPrices"));
  const realPrice = realPrices.find(price => price.getAttribute("Currency") === "USD")
    || realPrices.find(price => price.getAttribute("Currency") === "EUR");

  let price = "";
  let priceClass = "price";
  let priceBar = "";
  if (cost) {
    price = formatAmount(cost.getAttribute("amount"));
    priceBar = PRICE_BAR_URLS[cost.getAttribute("type")];
  } else if (realPrice) {
    const currency = realPrice.getAttribute("Currency");
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : `${currency} `;
    price = `${symbol}${realPrice.getAttribute("Value")}`;
    priceClass = "price_rc";
    priceBar = PRICE_BAR_URLS.realcurrency;
  }

  if (priceBar) {
    card.append(createImage("priceBar", priceBar));
  }

  const nameElement = document.createElement("span");
  nameElement.className = "name";
  nameElement.textContent = displayName;
  card.append(nameElement);

  if (price) {
    const priceElement = document.createElement("span");
    priceElement.className = priceClass;
    priceElement.textContent = price;
    card.append(priceElement);
  }

  const allowedPurchases = getTagValue(item, "purchasesAllowed");
  const extraElement = document.createElement("span");
  extraElement.className = "extra";
  extraElement.textContent = allowedPurchases
    ? `${allowedPurchases} ${allowedPurchases === "1" ? "compra" : "compras"}`
    : "Compras Ilimitadas";
  card.append(extraElement);

  return card;
}

async function loadShopItems() {
  const shopBlock = document.querySelector(".shop-block");
  if (!shopBlock) {
    throw new Error("No se encontró el contenedor de la tienda.");
  }

  const [xmlText, localisationText] = await Promise.all([
    fetchText(SHOP_ITEMS_URL, "shopitems.xml"),
    fetchText(LOCALISATION_URL, "localisation_es.txt")
  ]);
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("shopitems.xml no contiene XML válido.");
  }

  const localisation = parseLocalisation(localisationText);
  const items = Array.from(xml.getElementsByTagName("ShopItem"))
    .filter(item => (item.getAttribute("hidden") || "").toLowerCase() !== "true");
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.append(createItemCard(item, localisation));
  }

  shopBlock.replaceChildren(fragment);
}

async function fetchText(url, fileName) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileName} (${response.status}).`);
  }
  return response.text();
}

function parseLocalisation(text) {
  const localisation = new Map();
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const separator = line.indexOf(";");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && value) {
      localisation.set(key, value);
    }
  }
  return localisation;
}

loadShopItems().catch(error => {
  console.error("Error al generar los artículos de la tienda:", error);
  const shopBlock = document.querySelector(".shop-block");
  if (shopBlock) {
    const message = document.createElement("p");
    message.className = "shop-error";
    message.textContent = error.message;
    shopBlock.replaceChildren(message);
  }
});