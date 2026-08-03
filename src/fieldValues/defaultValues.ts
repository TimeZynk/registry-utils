import Immutable from 'immutable';
import { isNil } from 'lodash-es';
import type { FieldInstance } from '../types.js';

// Deliberately NOT sharing logic with dataBuilderFactory.ts's internal mergeDefaultValues:
// that function applies a default-val to every non-archived field regardless of whether the
// field is dynamic (has settings.input, e.g. from-serial/from-fields), using its own broader
// isEmpty() check (also treats '' and empty collections as empty). This function preserves
// tzstores' original, narrower behavior exactly: only static fields (no settings.input), and
// only isNil (not isEmpty) skips a value — an empty string default is still applied, matching
// the ~9 existing tzcontrol call sites' current behavior. Merging the two risked silently
// changing one or the other.
export function processDefaults(fieldInstances: Immutable.Map<string, FieldInstance>): Immutable.Map<string, any> {
    return fieldInstances.reduce(
        (reduction: Immutable.Map<string, any> | undefined, maybeF: FieldInstance | undefined) => {
            const acc = reduction as Immutable.Map<string, any>;
            const f = maybeF as FieldInstance;
            if (f.get('archived')) {
                return acc;
            }

            const input = f.getIn(['settings', 'input']);
            if (!input) {
                const val = f.getIn(['values', 'default-val']);
                if (!isNil(val)) {
                    return acc.set(f.get('id'), val);
                }
            }

            return acc;
        },
        Immutable.Map()
    );
}
