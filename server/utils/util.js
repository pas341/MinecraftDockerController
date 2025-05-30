var c = {
	color: {
		accent: 0x37A0DC,
		error: 0xe74c3c,
		warning: 0xe67e22,
	},
	array: {
		removeItem: function (item, array) {
			let index = array.indexOf(item);

			if (index > -1) {
				array.splice(index, 1);
			}

			return array;
		},
		sort: {
			byPropertyString: function (property, ignoreCase) {
				if (ignoreCase) {
					return function (a, b) {
						return a[property].toLowerCase().localeCompare(b[property].toLowerCase());
					};
				} else {
					return function (a, b) {
						return a[property].localeCompare(b[property]);
					};
				}
			}
		}
	},
	cookieGenerator: {
		int: function (int) {
			return Math.floor(Math.random() * (int || 25)); //randomly choose 0-99 if no int specified
		},
		letters: function (params) {
			let t = '', chars = '';

			if (!params || typeof (params) !== 'object') {
				params = { quantity: 1 };
				chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
			} else {
				if (!params.quantity || !Number(params.quantity)) {
					params.quantity = 1;
				}

				if (params.lowercase) {
					chars += 'abcdefghijklmnopqrstuvwxyz';
				}

				if (params.uppercase) {
					chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
				}
			}

			for (let i = 0; i < params.quantity; i++) {
				t += chars.charAt(c.cookieGenerator.int(chars.length));
			}

			return t;
		},
		numbers: function (params) {
			let t = '', chars = '1234567890';

			if (params && typeof (params) === 'number') {
				params = { quantity: params };
			} else if (!params || typeof (params) !== 'object') {
				params = { quantity: 1 };
			} else {
				if (!params.quantity || !Number(params.quantity)) {
					params.quantity = 1;
				}
			}

			for (let i = 0; i < params.quantity; i++) {
				t += chars.charAt(c.cookieGenerator.int(chars.length));
			}

			return t;
		},
		lettersAndNumbers: function (params) {
			let defaultQuantity = 5, t = '';

			if (params && typeof (params) === 'number') {
				params = { lowercase: true, uppercase: true, quantity: params };
			} else if (!params || typeof (params) !== 'object') {
				params = { lowercase: true, uppercase: true, quantity: defaultQuantity };
			} else {
				if (!params.quantity || !Number(params.quantity)) {
					params.quantity = defaultQuantity;
				}
			}

			for (var i = 0; i < params.quantity; i++) {
				let r = Math.floor(Math.random() * 2);

				if (r) {
					t += c.cookieGenerator.int(10);
				} else {
					t += c.cookieGenerator.letters({ lowercase: params.lowercase, uppercase: params.uppercase, quantity: 1 });
				}
			}

			return t;
		}
	},
	prettyDate: function (date, ignoreTime = false) {
		date = date || new Date();

		let y = date.getFullYear();
		let m = date.getMonth();
		m = m < 9 ? '0' + (m + 1) : (m + 1);
		let d = date.getDate();
		d = d < 10 ? '0' + d : d;
		let h = date.getHours();
		h = h > 12 ? h - 12 : h;
		let i = date.getMinutes();
		i = i < 10 ? '0' + i : i;
		let a = date.getHours() >= 12 ? 'PM' : 'AM';

		return y + '-' + m + '-' + d + (!ignoreTime ? (' ' + h + ':' + i + ' ' + a) : '');
	},
	getUserByProperty: function (a, property, value) {
		let o = {};

		for (let i = 0; i < a.length; i++) {
			if (a[i][property] === value) {
				o = a[i];
				break;
			}
		}

		return o;
	},
	sleep: async function (millis) {
		return new Promise(resolve => setTimeout(resolve, millis));
	},
	streamToString: (stream) =>  {
		return new Promise((resolve, reject) => {
			let chunks = [];
			stream.on('data', (chunk) => chunks.push(chunk));
			stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
			stream.on('error', (err) => reject(err));
		});
	},
	string: {
		slugify: function (s) {
			s = s.replace(/[^\w\s#-]/gi, '').replace(/ /g, '_').replace(/-/g, '_').replace(/_+(?=)/g, '_');
			s = s.replace(/_/g, ' ').trim().replace(/ +(?= )/g, '').replace(/ /g, '_').substring(0, 15);
			return s;
		}
	},
	sort: {
		byPropertyBool: function (property) {
			return function (a, b) {
				return b[property] - a[property];
			};
		},
		byPropertyString: function (property, ignoreCase) {
			if (ignoreCase) {
				return function (a, b) {
					return a[property].toLowerCase().localeCompare(b[property].toLowerCase());
				};
			} else {
				return function (a, b) {
					return a[property].localeCompare(b[property]);
				};
			}
		},
		byPropertyValue: function (property) {
			return function (a, b) {
				return b[property] - a[property];
			};
		},
		byTwoPropertyValues: function (property, property2) {
			return function (a, b) {
				return b[property] - a[property] || a[property2].localeCompare(b[property2]);
			};
		},
		byPropertyValueThenPropertyBool: function (property, property2) {
			return function (a, b) {
				return b[property] - a[property] || b[property2] - a[property2];
			};
		},
		byPropertyValueThenPropertyString: function (property, property2) {
			return function (a, b) {
				return b[property] - a[property] || a[property2].toLowerCase().localeCompare(b[property2].toLowerCase());
			};
		},
		byPropertyValueThenPropertyStringUp: function (property, property2) {
			return function (a, b) {
				return b[property] - a[property] || b[property2].toLowerCase().localeCompare(a[property2].toLowerCase());
			};
		},
		byPropertyStringThenPropertyString: function (property, property2, ignoreCase) {
			if (ignoreCase) {
				return function (a, b) {
					return a[property].toLowerCase().localeCompare(b[property].toLowerCase()) || a[property2].toLowerCase().localeCompare(b[property2].toLowerCase());
				};
			} else {
				return function (a, b) {
					return a[property].localeCompare(b[property]) || a[property2].localeCompare(b[property2]);
				};
			}
		},
		byPropertyStringThenPropertyStringUp: function (property, property2, ignoreCase) {
			if (ignoreCase) {
				return function (a, b) {
					return a[property].toLowerCase().localeCompare(b[property].toLowerCase()) || b[property2].toLowerCase().localeCompare(a[property2].toLowerCase());
				};
			} else {
				return function (a, b) {
					return a[property].localeCompare(b[property]) || b[property2].localeCompare(a[property2]);
				};
			}
		}
	}
};

exports.util = c;
