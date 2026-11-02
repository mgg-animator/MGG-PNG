const SHOP_ITEMS_URL = "https://s-beta.kobojo.com/mutants/gameconfig/shopitems.xml";
const LOCALISATION_URL = "https://s-beta.kobojo.com/mutants/gameconfig/localisation_es.txt";
const ASSET_BASE_URL = "https://s-beta.kobojo.com/mutants/assets/";
const DEFAULT_BACKGROUND_URL = `${ASSET_BASE_URL}hud/shop/fx_item_hc.png`;
const SKIN_STARS = {
  bronze: "1",
  silver: "2",
  gold: "3",
  platinum: "4"
};
const STAR_SKINS = {
  "1": "bronze",
  "2": "silver",
  "3": "gold",
  "4": "platinum"
};
const PRICE_BAR_URLS = {
  hardcurrency: "../IMG/shop_bar_hc.png",
  softcurrency: "../IMG/shop_bar_sc.png",
  realcurrency: "../IMG/shop_bar_rc.png"
};

function getTagValue(item, key) {
  const tags = Array.from(item.children).filter(child => child.tagName === "Tag");
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

function appendLocalizedText(element, text) {
  const lines = text.split(/\\n|\r?\n/);
  lines.forEach((line, index) => {
    if (index > 0) {
      element.append(document.createElement("br"));
    }
    element.append(document.createTextNode(line));
  });
}

function getLocalizedValue(localisation, key, fallback = "") {
  return localisation.get((key || "").toLowerCase()) || fallback;
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

  return picture.toLowerCase();
}

function createItemCard(item, localisation) {
  const card = document.createElement("div");
  card.className = "shop-item";

  const itemName = item.getAttribute("itemId");
  const displayName = getLocalizedValue(localisation, itemName)
    || getLocalizedValue(localisation, `${itemName}_payment_text`)
    || itemName;
  const background = getTagValue(item, "bg");
  card.append(createImage(
    "item-background",
    background
      ? `${ASSET_BASE_URL}hud/shop/fx_item_hc_${background}.png`
      : DEFAULT_BACKGROUND_URL
  ));

  const picture = getItemPicture(item);
  if (picture) {
    card.append(createImage(
      "item-thumbnails",
      `${ASSET_BASE_URL}thumbnails/${picture}.png`,
      itemName
    ));

    if (picture.startsWith("specimen")) {
      const article = item.getElementsByTagName("ArticleItem")[0];
      const typeId = article?.getAttribute("typeId") || "";
      const gene = typeId.match(/^Specimen_([A-Za-z])/i)?.[1];
      if (gene) {
        card.append(createImage(
          "item-platform",
          `${ASSET_BASE_URL}hud/shop/flap/base_${gene.toLowerCase()}_big.png`
        ));
      }
    }
  }

  const offerTag = item.getAttribute("offerTag") || item.getAttribute("offertag");
  if (offerTag) {
    card.append(createImage(
      "item-tag",
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
    card.append(createImage("item-priceBar", priceBar));
  }

  const nameElement = document.createElement("span");
  nameElement.className = "item-name";
  appendLocalizedText(nameElement, displayName);
  card.append(nameElement);

  if (price) {
    const priceElement = document.createElement("span");
    priceElement.className = priceClass === "price_rc" ? "item-price_rc" : "item-price";
    priceElement.textContent = price;
    card.append(priceElement);
  }

  const allowedPurchases = getTagValue(item, "purchasesAllowed");
  const extraElement = document.createElement("span");
  extraElement.className = "item-extra";
  extraElement.textContent = allowedPurchases
    ? `${allowedPurchases} ${allowedPurchases === "1" ? "compra" : "compras"}`
    : "Compras Ilimitadas";
  card.append(extraElement);

  const infoButton = createImage("item-info", "../IMG/btn_info.png", "Mostrar contenido");
  infoButton.tabIndex = 0;
  infoButton.setAttribute("role", "button");
  card.append(infoButton);

  const content = document.createElement("div");
  content.className = "shop-item-content hidden";
  const contentId = `shop-item-content-${itemName.replace(/[^a-zA-Z0-9_-]/g, "-")}-${createItemCard.nextId++}`;
  content.id = contentId;
  infoButton.setAttribute("aria-controls", contentId);
  infoButton.setAttribute("aria-expanded", "false");
  appendItemContent(content, item, localisation);
  card.append(content);

  return card;
}

createItemCard.nextId = 0;

function getArticleItems(item) {
  return Array.from(item.getElementsByTagName("ArticleItems")[0]?.children || [])
    .filter(article => article.tagName === "ArticleItem");
}

function getArticleTagValue(article, key) {
  const tags = Array.from(article.children).filter(child => child.tagName === "Tag");
  return tags.find(tag => tag.getAttribute("key") === key)?.getAttribute("value") || "";
}

function createArticleObject(article) {
  const object = document.createElement("div");
  object.className = "object";

  const typeId = (article.getAttribute("typeId") || "").trim();
  const normalizedType = typeId.toLowerCase();
  const isSpecimen = normalizedType.startsWith("specimen");
  const skin = getArticleTagValue(article, "skin").toLowerCase();
  let thumbnailUrl = "";

  if (normalizedType === "hardcurrency" || normalizedType === "softcurrency") {
    thumbnailUrl = `../IMG/${normalizedType}.png`;
  } else if (typeId) {
    const thumbnailPath = isSpecimen
      ? `thumbnails/${normalizedType}`
      : `mobile/thumbnails/${normalizedType}`;
    thumbnailUrl = `${ASSET_BASE_URL}${thumbnailPath}.png`;
    if (isSpecimen && skin) {
      thumbnailUrl = `${ASSET_BASE_URL}${thumbnailPath}_${skin}.png`;
    }
  }

  if (thumbnailUrl) {
    object.append(createImage("thumbnail", thumbnailUrl, typeId));
  }

  if (isSpecimen && skin && !Object.prototype.hasOwnProperty.call(SKIN_STARS, skin)) {
    object.append(createImage("skin", `../IMG/icon_${skin}.png`, skin));
  }

  if (isSpecimen) {
    const starValue = getArticleTagValue(article, "star")
      || getArticleTagValue(article, "stars")
      || SKIN_STARS[skin];
    const starSkin = STAR_SKINS[starValue];
    if (starSkin) {
      object.append(createImage("star", `../IMG/star_${starSkin}.png`, `${starSkin} star`));
    }
  }

  const amount = article.getAttribute("amount");
  if (amount && Number(amount) !== 1) {
    const amountElement = document.createElement("span");
    amountElement.className = "amount";
    amountElement.textContent = `x${formatAmount(amount)}`;
    object.append(amountElement);
  }

  return object;
}

function getArticleGroups(item) {
  const articles = getArticleItems(item);
  const hasOptions = articles.some(article => getArticleTagValue(article, "option"));
  if (!hasOptions) {
    return articles.length ? [{ option: "", articles }] : [];
  }

  const groups = new Map();
  articles.forEach((article, index) => {
    const option = getArticleTagValue(article, "option");
    const key = option || `__without_option_${index}`;
    if (!groups.has(key)) {
      groups.set(key, { option, articles: [] });
    }
    groups.get(key).articles.push(article);
  });
  return Array.from(groups.values());
}

function getGroupWeights(item, groups) {
  const randomTags = Array.from(item.children)
    .filter(child => child.tagName === "Tag" && child.getAttribute("key").startsWith("rand_"));
  const weights = groups.map(group => {
    if (!group.option) {
      return 0;
    }
    const randomTag = randomTags.find(tag =>
      tag.getAttribute("key").slice(5).toLowerCase() === group.option.toLowerCase()
    );
    const weight = Number(randomTag?.getAttribute("value"));
    return Number.isFinite(weight) && weight > 0 ? weight : 0;
  });
  const total = randomTags.reduce((sum, tag) => {
    const weight = Number(tag.getAttribute("value"));
    return Number.isFinite(weight) && weight > 0 ? sum + weight : sum;
  }, 0);
  return { weights, total };
}

function appendItemContent(content, item, localisation) {
  const caption = item.getAttribute("caption");
  if (caption) {
    const description = document.createElement("span");
    description.className = "description";
    appendLocalizedText(
      description,
      getLocalizedValue(localisation, caption, caption)
    );
    content.append(description);
  }

  const groups = getArticleGroups(item);
  const { weights, total } = getGroupWeights(item, groups);
  groups.forEach((group, groupIndex) => {
    const groupElement = document.createElement("div");
    groupElement.className = "item";

    group.articles.forEach((article, articleIndex) => {
      if (articleIndex > 0) {
        groupElement.append(createImage("plus", "../IMG/plus.png", "más"));
      }
      groupElement.append(createArticleObject(article));
    });

    const chance = document.createElement("span");
    chance.className = "chance";
    const percentage = groups.length === 1 && !group.option
      ? 100
      : total
      ? weights[groupIndex] / total * 100
      : groups.length === 1 ? 100 : null;
    if (percentage !== null) {
      chance.textContent = `${Number(percentage.toFixed(2))}%`;
      groupElement.append(chance);
    }
    content.append(groupElement);
  });
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
  shopBlock.addEventListener("click", event => {
    const infoButton = event.target.closest?.(".item-info");
    if (infoButton) {
      toggleItemContent(infoButton);
    }
  });
  shopBlock.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches?.(".item-info")) {
      event.preventDefault();
      toggleItemContent(event.target);
    }
  });
}

function toggleItemContent(infoButton) {
  const content = infoButton.parentElement.querySelector(".shop-item-content");
  if (!content) {
    return;
  }
  const isExpanded = content.classList.toggle("hidden") === false;
  infoButton.setAttribute("aria-expanded", String(isExpanded));
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
      localisation.set(key.toLowerCase(), value);
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