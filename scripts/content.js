const baseUrl = "https://api.mby.vn/api/oversea-ordering";
var globalRate;
var token;
let initExtensionInterval;

const TAOBAO_TYPE = {
  TAOBAO: "TAOBAO",
  TMALL: "TMALL",
};

chrome.storage.local.get("aaltoToken", (result) => {
  token = result.aaltoToken;
});

function formatMoneyToVND(number) {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });

  return formatter.format(number);
}

function showToast(success) {
  const x = document.getElementById("oversea-toast");
  if (!success) {
    x.innerHTML = "Thêm vào giỏ hàng thất bại";
    x.style.backgroundColor = "red";
  }
  x.className = "show";
  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 3000);
}

function updateTMallItemPrice(rate) {
  let isFoundDOM = false;
  const foundDOM = setInterval(() => {
    const regex = /(Price--priceText-.*)|(tb-rmb-num)/;
    const elements = document.querySelectorAll("*");

    const matchingElements = Array.from(elements).filter((element) => {
      return Array.from(element.classList).some((className) =>
        regex.test(className)
      );
    });
    const quantity =
      document.getElementsByClassName("countValueForPC")[0]?.value;

    const newPrice = matchingElements[0].innerHTML;
    if (!!newPrice && quantity) {
      isFoundDOM = true;
      document.getElementById("taobao-gia-ban").innerHTML = formatMoneyToVND(
        +newPrice * +rate * +quantity
      );
    }
  }, 500);

  if (isFoundDOM) clearInterval(foundDOM);
}

function updateTaobaoItemPrice(rate) {
  let isFoundDOM = false;
  const foundDOM = setInterval(() => {
    const oldPrice = document.querySelectorAll(".tb-property-cont .tb-rmb-num");
    const salePrice = document.querySelectorAll(
      ".tb-promo-price #J_PromoPriceNum"
    );
    const showPrice = !!salePrice.length ? salePrice : oldPrice;
    const quantity = document.getElementById("J_IptAmount").value;

    if (!!showPrice.length) {
      isFoundDOM = true;
      const newPrice = showPrice[0].innerHTML
        .split("-")
        .map((e) => formatMoneyToVND(e * rate * +quantity))
        .join("-");
      document.getElementById("taobao-gia-ban").innerHTML = newPrice;
    }
  }, 500);

  if (isFoundDOM) clearInterval(foundDOM);
}

function fetchExchangeRate() {
  fetch(`${baseUrl}/variables?name=exchangeRate&page=1&perPage=1`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "access-token": `${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      globalRate = data[0].value;
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function addToCartTMallItem() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const skuId = params.get("skuId");
  if (!skuId || !productId) {
    alert("Vui lòng chọn đủ thuộc tính sản phẩm");
    return;
  }

  const quantity = document.getElementsByClassName("countValueForPC")[0].value;
  const btn = document.getElementById("cart-btn");
  btn.classList.add("loading");
  btn.setAttribute("disabled", "");

  fetch(`${baseUrl}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": `${token}`,
    },
    body: JSON.stringify({
      id: productId,
      skuId,
      volume: Number(quantity),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        showToast(true);
      }
      if (data.error) {
        showToast(false);
      }
    })
    .then(() => {
      btn.classList.remove("loading");
      btn.removeAttribute("disabled");
    });
}

function addToCartTaobaoItem() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const pickProperty = document.querySelectorAll(".tb-skin .tb-selected");
  const maxProp = document.querySelectorAll(".J_TSaleProp").length;
  const properties = [];
  pickProperty.forEach((e) => {
    properties.push(e.dataset.value);
  });
  if (properties.length !== maxProp || !productId) {
    alert("Vui lòng chọn đủ thuộc tính sản phẩm");
    return;
  }

  const quantity = document.getElementById("J_IptAmount").value;
  const btn = document.getElementById("cart-btn");
  btn.classList.add("loading");
  btn.setAttribute("disabled", "");

  fetch(`${baseUrl}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": `${token}`,
    },
    body: JSON.stringify({
      id: productId,
      pvid: properties,
      volume: Number(quantity),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        showToast(true);
      }
      if (data.error) {
        showToast(false);
      }
    })
    .then(() => {
      btn.classList.remove("loading");
      btn.removeAttribute("disabled");
    });
}

function purchase() {
  window.open("https://app.mby.vn/cart", "_blank").focus();
}

function scanDOM() {
  let elementsTMallForMountExtension;
  let elementsTaobaoForMountExtension;
  let type;

  // Scan DOM Ver 2
  elementsTMallForMountExtension = document.querySelectorAll(
    '[class^="BasicContent--sku"]'
  );
  elementsTaobaoForMountExtension =
    document.querySelectorAll('[class^="tb-skin"]');

  // Map type
  if (elementsTMallForMountExtension) {
    type = TAOBAO_TYPE.TMALL;
  } else if ((type = TAOBAO_TYPE.TAOBAO)) {
    type = TAOBAO_TYPE.TAOBAO;
  }

  /*
  - Check whether extension being mounted successfully or not
  - If succeed, clear interval
  */

  //  // Scan DOM Ver 1
  //  const elements = document.querySelectorAll("*");
  //  const regexTaobaoItem = /tb-skin*/;
  //  const regexTmall = /BasicContent--sku.*/;

  //  elementsTaobaoForMountExtension = Array.from(elements).filter((element) => {
  //    return Array.from(element.classList).some((className) =>
  //      regexTaobaoItem.test(className)
  //    );
  //  })[0];

  //  elementsTMallForMountExtension = Array.from(elements).filter((element) => {
  //    return Array.from(element.classList).some((className) =>
  //      regexTmall.test(className)
  //    );
  //  })[0];

  if (
    !!elementsTMallForMountExtension.length ||
    !!elementsTaobaoForMountExtension.length
  ) {
    return {
      element:
        elementsTMallForMountExtension[0] || elementsTaobaoForMountExtension[0],
      type,
    };
  }

  return null;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function main() {
  if (!globalRate) {
    fetchExchangeRate();
    return;
  }
  const domElementMountExtension = scanDOM();
  console.log(
    "🚀 ~ main ~ domElementMountExtension:",
    domElementMountExtension
  );
  if (domElementMountExtension) {
    clearInterval(initExtensionInterval);
  } else return;

  const customActionsContainer = document.createElement("div");
  customActionsContainer.style.maxWidth = "450px";
  customActionsContainer.style.fontFamily = "system-ui";
  customActionsContainer.style.fontSize = "15px";

  customActionsContainer.id = "to-platform";
  customActionsContainer.innerHTML = `
    <img style=" width: 100px;float: right; margin-top: 5px;" src="https://i.ibb.co/CWFcJjc/mby.png" alt="logo_mby"/>
      <ul>
        <li>Giá bán: <span id="taobao-gia-ban">200đ</span></li>
        <li>Tỷ giá 1 ¥: <span id="taobao-ti-gia">${numberWithCommas(
          globalRate
        )}đ</span></li>
      </ul>
  

    <div id="to-actions-container">
      <div id="oversea-toast">Thêm vào giỏ hàng MBY Logistics thành công.</div>
      <button id="purchase-btn">Đến giỏ hàng</button>
      <button id="cart-btn" class="">
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: rgb(239, 239, 239); shape-rendering: auto;" width="25px" height="25px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
          <g transform="rotate(0 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.9166666666666666s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(30 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.8333333333333334s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(60 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.75s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(90 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(120 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5833333333333334s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(150 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(180 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.4166666666666667s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(210 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(240 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.25s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(270 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.16666666666666666s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(300 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.08333333333333333s" repeatCount="indefinite"></animate>
            </rect>
          </g><g transform="rotate(330 50 50)">
            <rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#e4812f">
              <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"></animate>
            </rect>
          </g>
        </svg>
        <svg
          class="cart-icon"
          width="800px"
          height="800px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z"
            stroke-width="1.5"
          />
          <path
            d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"
            stroke-width="1.5"
          />
          <path
            d="M11 10.8L12.1429 12L15 9"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M2 3L2.26121 3.09184C3.5628 3.54945 4.2136 3.77826 4.58584 4.32298C4.95808 4.86771 4.95808 5.59126 4.95808 7.03836V9.76C4.95808 12.7016 5.02132 13.6723 5.88772 14.5862C6.75412 15.5 8.14857 15.5 10.9375 15.5H12M16.2404 15.5C17.8014 15.5 18.5819 15.5 19.1336 15.0504C19.6853 14.6008 19.8429 13.8364 20.158 12.3075L20.6578 9.88275C21.0049 8.14369 21.1784 7.27417 20.7345 6.69708C20.2906 6.12 18.7738 6.12 17.0888 6.12H11.0235M4.95808 6.12H7"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        Thêm vào giỏ
      </button>
    </div>
        `;

  domElementMountExtension.element.prepend(customActionsContainer);

  if (domElementMountExtension.type === TAOBAO_TYPE.TMALL) {
    updateTMallItemPrice(globalRate);
    // actions container
    const [purchaseButton, addToCartButton] =
      customActionsContainer.getElementsByTagName("button");
    purchaseButton.addEventListener("click", purchase);
    addToCartButton.addEventListener("click", addToCartTMallItem);
    // On click product
    document
      .querySelectorAll(".skuCate .skuItemWrapper .skuItem")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          updateTMallItemPrice(globalRate);
        });
      });

    document.querySelectorAll(".countWrapper .quantityBtn").forEach((item) => {
      item.addEventListener("click", (e) => {
        updateTMallItemPrice(globalRate);
      });
    });
  } else if (domElementMountExtension.type === TAOBAO_TYPE.TAOBAO) {
    updateTaobaoItemPrice(globalRate);
    // actions container
    const [purchaseButton, addToCartButton] =
      customActionsContainer.getElementsByTagName("button");
    purchaseButton.addEventListener("click", purchase);
    addToCartButton.addEventListener("click", addToCartTaobaoItem);
    // On click product
    document.querySelectorAll(".J_TSaleProp li").forEach((item) => {
      item.addEventListener("click", (e) => {
        updateTaobaoItemPrice(globalRate);
      });
    });

    document.querySelectorAll("#J_Stock a").forEach((item) => {
      item.addEventListener("click", (e) => {
        updateTaobaoItemPrice(globalRate);
      });
    });
  }

  // token not found
  if (!token) {
    const actionContainer = document.getElementById("to-actions-container");
    if (actionContainer) {
      actionContainer.innerHTML = `<span">Để thêm sản phẩm vào giỏ hàng, vui lòng <a href='https://app.mby.vn/auth/login' target='_blank' style="text-decoration: underline;"> đăng nhập</a> </span>`;
    }
  }
}

document.addEventListener("readystatechange", (event) => {
  fetchExchangeRate();
  initExtensionInterval = setInterval(() => {
    main();
  }, 500);
});
