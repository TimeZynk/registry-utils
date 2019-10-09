// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.
'use strict';
var defaultRegisters = require('./defaultRegisters');

var ALLOWANCE_REG_ID = defaultRegisters.ALLOWANCE_REG_ID;
var AVAIL_REG_ID = defaultRegisters.AVAIL_REG_ID;
var MATERIALS_REG_ID = defaultRegisters.MATERIALS_REG_ID;
var REPORTS_REG_ID = defaultRegisters.REPORTS_REG_ID;
var SHIFTS_REG_ID = defaultRegisters.SHIFTS_REG_ID;
var USERS_REG_ID = defaultRegisters.USERS_REG_ID;

exports.registers = function registers(t) {
    t = t || window.t;
    return [{
        id: USERS_REG_ID,
        title: t.Users,
        description: t.registry_user_description,
        link: '/users',
        icon: 'tz-icon users',
        isStatic: true,
    }, {
        id: SHIFTS_REG_ID,
        title: t.Shifts,
        description: t.registry_shift_description,
        link: '/shifts',
        icon: 'tz-icon plan',
        isStatic: true,
    }, {
        id: REPORTS_REG_ID,
        title: t.Timereports,
        description: t.registry_report_description,
        link: '/reports',
        icon: 'tz-icon approve',
        isStatic: true,
    }, {
        id: MATERIALS_REG_ID,
        title: t.materials_reg_title,
        description: '',
        link: '/registers/' + MATERIALS_REG_ID,
        icon: 'tz-icon invoice-items',
        isStatic: true,
        'if-module': 'materials',
    }, {
        id: ALLOWANCE_REG_ID,
        title: t.allowance_reg_title,
        description: '',
        link: '/registers/' + ALLOWANCE_REG_ID,
        icon: 'icon-globe',
        isStatic: true,
        'if-module': 'travel',
    }];
};

// Field instances
exports.registryFields = function registryFields(t) {
    t = t || window.t;
    return [
        /* User registry fields */
        {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'name',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.userNameColumn,
            weight: 1,
            isStatic: true,
            required: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'username',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_login_column,
            weight: 2,
            isStatic: true,
            required: true,
        }, {
            'field-id': 'email',
            'field-type': 'string',
            'field-section': 'generic',
            id: 'email',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.userEmailColumn,
            weight: 3,
            isStatic: true,
            required: true,
        },

        // User system settings
        {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'employee-no',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_employee_no,
            weight: 4,
            isStatic: true,
            protected: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'department',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.Department,
            weight: 5,
            isStatic: true,
            protected: true,
        },

        // User personal info
        {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'id-no',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_id_no_label,
            weight: 6,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'bank-account',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_bank_account_label,
            weight: 7,
            isStatic: true,
            settings: {
                nogroup: true,
            },
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'company',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.Company,
            weight: 8,
            isStatic: true,
            protected: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'country-code',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_country_code,
            weight: 9,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'phone',
            id: 'mobile',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_mobile_phone,
            weight: 10,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'phone',
            id: 'work-phone',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_work_phone,
            weight: 11,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'phone',
            id: 'home-phone',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_home_phone,
            weight: 12,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'address',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_address_column,
            weight: 13,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'zip',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_zip_column,
            weight: 14,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'city',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_city_column,
            weight: 15,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'relative-name',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_relative_name_column,
            weight: 16,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'relative-phone',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_relative_phone_column,
            weight: 17,
            isStatic: true,
        }, {
            'field-id': 'default-text',
            'field-type': 'text',
            id: 'notes',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.Comments,
            weight: 18,
            isStatic: true,
            protected: true,
            settings: {
                nogroup: true,
            },
        }, {
            'field-id': 'user-start-date',
            'field-type': 'date',
            id: 'start',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t['Start date'],
            weight: 19,
            isStatic: true,
            protected: true,
            readonly: true,
            settings: {
                nogroup: true,
            },
        }, {
            'field-id': 'user-end-date',
            'field-type': 'date',
            id: 'end',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t['End date'],
            weight: 20,
            isStatic: true,
            protected: true,
            readonly: true,
            settings: {
                nogroup: true,
            },
        }, {
            'field-id': 'user-may-view-all-schedules',
            'field-type': 'boolean',
            id: 'may-view-all-schedules',
            vid: 'static',
            'registry-id': USERS_REG_ID,
            title: t.user_view_all_schedules,
            weight: 21,
            isStatic: true,
            protected: true,
            readonly: true,
            settings: {
                nogroup: true,
            },
        },

        /* Shift registry fields */
        {
            'field-id': 'start-end',
            'field-type': 'start-end',
            id: 'shift-startend',
            vid: 'static',
            'registry-id': SHIFTS_REG_ID,
            title: t.shift_startend_field,
            weight: 1,
            isStatic: true,
        }, {
            'field-id': 'breaks',
            'field-type': 'breaks',
            id: 'shift-breaks',
            vid: 'static',
            'registry-id': SHIFTS_REG_ID,
            title: t.Breaks,
            weight: 2,
            isStatic: true,
        }, {
            'field-id': 'default-number',
            'field-type': 'number',
            id: 'shift-duplicity',
            vid: 'static',
            'registry-id': SHIFTS_REG_ID,
            title: t.Duplicity,
            weight: 7,
            isStatic: true,
            settings: {
                size: 'mini',
            },
        },

        // Availability fields
        {
            'field-id': 'start-end',
            'field-type': 'start-end',
            id: 'avail-startend',
            'registry-id': AVAIL_REG_ID,
            title: t.shift_startend_field,
            weight: 0,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'avail-title',
            'registry-id': AVAIL_REG_ID,
            title: t.Message,
            weight: 1,
            isStatic: true,
        },

        // Report fields
        {
            'field-id': 'start-end',
            'field-type': 'start-end',
            id: 'report-startend',
            vid: 'static',
            'registry-id': REPORTS_REG_ID,
            title: t.shift_startend_field,
            weight: 1,
            isStatic: true,
        }, {
            'field-id': 'breaks',
            'field-type': 'breaks',
            id: 'report-breaks',
            vid: 'static',
            'registry-id': REPORTS_REG_ID,
            title: t.Breaks,
            weight: 2,
            isStatic: true,
        }, {
            'field-id': 'materials',
            'field-type': 'materials',
            id: 'report-materials',
            vid: 'static',
            'registry-id': REPORTS_REG_ID,
            title: t.materials_reg_title,
            weight: 3,
            'if-module': 'materials',
            isStatic: true,
        },

        // Materials fields
        {
            'field-id': 'title',
            'field-type': 'string',
            id: 'title-' + MATERIALS_REG_ID,
            vid: 'static',
            'registry-id': MATERIALS_REG_ID,
            title: t.Name,
            weight: -100,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'sku',
            vid: 'static',
            'registry-id': MATERIALS_REG_ID,
            title: t.SKU,
            weight: 1,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'unit',
            vid: 'static',
            'registry-id': MATERIALS_REG_ID,
            title: t.article_unit,
            weight: 2,
            isStatic: true,
        }, {
            'field-id': 'default-number',
            'field-type': 'number',
            id: 'price',
            vid: 'static',
            'registry-id': MATERIALS_REG_ID,
            title: t.Price,
            weight: 3,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'currency',
            vid: 'static',
            'registry-id': MATERIALS_REG_ID,
            title: t.Currency,
            weight: 4,
            isStatic: true,
        },

        // Allowance fields
        {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'payroll-code',
            vid: 'static',
            'registry-id': ALLOWANCE_REG_ID,
            title: t['Salary code'],
            weight: 1,
            isStatic: true,
        }, {
            'field-id': 'default-string',
            'field-type': 'string',
            id: 'payroll-amount',
            vid: 'static',
            'registry-id': ALLOWANCE_REG_ID,
            title: t.allowance_payroll_amount,
            weight: 2,
            isStatic: true,
        },
    ];
};
